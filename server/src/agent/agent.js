/**
 * Kosha Copilot orchestrator.
 *
 *   user message ─► Gemini (function calling over Kosha tools)
 *                     │ fails / no key / rate-limited
 *                     └─► offline rule engine (same tools, template replies)
 *
 * Drafted writes (new transaction, budget) are stored on the assistant message as a
 * pendingAction and only executed when the user confirms them.
 */
import { transactionApiSchema, budgetApiSchema } from '@kosha/shared';
import { env } from '../config/env.js';
import { AssistantMessage } from '../models/AssistantMessage.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { createTransaction } from '../services/transaction.service.js';
import { upsertBudget } from '../services/budget.service.js';
import { createToolExecutor, toolDeclarations } from './tools.js';
import { buildSystemPrompt } from './prompt.js';
import { createGeminiProvider } from './providers/gemini.provider.js';
import { createLocalProvider } from './providers/local.provider.js';
import { generateInsights } from './insights.js';

const HISTORY_FOR_MODEL = 10;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

export function createAgent({ gemini } = {}) {
  const geminiProvider =
    gemini !== undefined
      ? gemini
      : env.geminiApiKey
        ? createGeminiProvider({ apiKey: env.geminiApiKey, model: env.geminiModel })
        : null;
  const local = createLocalProvider();
  let cooldownUntil = 0;

  const geminiAvailable = () => Boolean(geminiProvider) && Date.now() >= cooldownUntil;

  function status() {
    return {
      provider: geminiAvailable() ? 'gemini' : 'offline',
      geminiConfigured: Boolean(geminiProvider),
      model: geminiProvider?.model ?? null,
    };
  }

  async function loadCategories(userId) {
    const docs = await Category.find({ user: userId }).sort({ name: 1 }).lean();
    return docs.map((c) => ({ id: String(c._id), name: c.name, type: c.type, icon: c.icon, color: c.color }));
  }

  async function recentHistory(userId) {
    const docs = await AssistantMessage.find({ user: userId }).sort({ createdAt: -1 }).limit(HISTORY_FOR_MODEL).lean();
    return docs.reverse().map((m) => ({
      role: m.role,
      content: m.pendingAction ? `${m.content}\n(Draft status: ${m.pendingAction.status})` : m.content,
    }));
  }

  async function handleMessage(user, text) {
    const now = new Date();
    const [categories, history] = await Promise.all([loadCategories(user._id), recentHistory(user._id)]);
    const userMessage = await AssistantMessage.create({ user: user._id, role: 'user', content: text });
    const executor = createToolExecutor({ userId: user._id, categories, now });

    let outcome = null;
    if (geminiAvailable()) {
      try {
        outcome = await geminiProvider.respond({
          text,
          history,
          executor,
          systemInstruction: buildSystemPrompt({ user, categories, now }),
          toolDeclarations,
        });
      } catch (err) {
        if (err?.status === 429) cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        if (!env.isTest) console.warn(`[copilot] Gemini unavailable (${err?.status ?? ''} ${err?.message}); using offline engine`);
      }
    }
    if (!outcome) outcome = await local.respond({ text, user, categories, executor, now });

    const message = await AssistantMessage.create({
      user: user._id,
      role: 'assistant',
      content: outcome.reply,
      provider: outcome.provider,
      toolCalls: outcome.toolCalls?.length ? outcome.toolCalls : undefined,
      data: outcome.data,
      pendingAction: outcome.pendingAction ? { ...outcome.pendingAction, status: 'pending' } : undefined,
    });
    return { userMessage, message };
  }

  async function findDraft(user, messageId) {
    const exists = await AssistantMessage.findOne({ _id: messageId, user: user._id, role: 'assistant' });
    if (!exists?.pendingAction) throw ApiError.notFound('Draft not found');
    return exists;
  }

  async function confirmAction(user, messageId) {
    // Atomically claim the draft so a double-click can't create two transactions.
    const claimed = await AssistantMessage.findOneAndUpdate(
      { _id: messageId, user: user._id, 'pendingAction.status': 'pending' },
      { $set: { 'pendingAction.status': 'confirming' } },
      { new: true },
    );
    if (!claimed) {
      const draft = await findDraft(user, messageId);
      throw ApiError.conflict(`This draft was already ${draft.pendingAction.status}`);
    }

    const { type, payload } = claimed.pendingAction;
    let result;
    try {
      if (type === 'create_transaction') {
        result = await createTransaction(user._id, transactionApiSchema.parse(payload), { source: 'copilot' });
      } else {
        result = await upsertBudget(user._id, budgetApiSchema.parse(payload));
      }
    } catch (err) {
      await AssistantMessage.updateOne({ _id: claimed._id }, { $set: { 'pendingAction.status': 'pending' } });
      throw err;
    }

    const message = await AssistantMessage.findByIdAndUpdate(
      claimed._id,
      { $set: { 'pendingAction.status': 'confirmed', 'pendingAction.resultId': result.id, 'pendingAction.resolvedAt': new Date() } },
      { new: true },
    );
    return { message, result };
  }

  async function cancelAction(user, messageId) {
    const message = await AssistantMessage.findOneAndUpdate(
      { _id: messageId, user: user._id, 'pendingAction.status': 'pending' },
      { $set: { 'pendingAction.status': 'cancelled', 'pendingAction.resolvedAt': new Date() } },
      { new: true },
    );
    if (!message) {
      const draft = await findDraft(user, messageId);
      throw ApiError.conflict(`This draft was already ${draft.pendingAction.status}`);
    }
    return { message };
  }

  async function history(user, limit = 60) {
    const docs = await AssistantMessage.find({ user: user._id }).sort({ createdAt: -1, _id: -1 }).limit(limit);
    return docs.reverse();
  }

  async function clearHistory(user) {
    await AssistantMessage.deleteMany({ user: user._id });
  }

  return {
    status,
    handleMessage,
    confirmAction,
    cancelAction,
    history,
    clearHistory,
    insights: (user) => generateInsights(user._id),
  };
}
