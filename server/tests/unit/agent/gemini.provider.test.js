import { describe, it, expect, vi } from 'vitest';
import { createGeminiProvider } from '../../../src/agent/providers/gemini.provider.js';

const modelTurn = (parts) => ({ candidates: [{ content: { role: 'model', parts } }] });

describe('Gemini provider (function-calling loop)', () => {
  it('runs the tool Gemini asks for, sends the result back, and returns the final answer', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({
        functionCalls: [{ id: 'c1', name: 'get_summary', args: { month: '2026-10' } }],
        ...modelTurn([{ functionCall: { id: 'c1', name: 'get_summary', args: { month: '2026-10' } } }]),
      })
      .mockResolvedValueOnce({
        text: 'You spent ₹37,000.00 in October.',
        ...modelTurn([{ text: 'You spent ₹37,000.00 in October.' }]),
      });

    const executor = {
      run: vi.fn().mockResolvedValue({ result: { expense: '₹37,000.00' }, data: { kind: 'summary' } }),
    };
    const provider = createGeminiProvider({ client: { models: { generateContent } }, model: 'test-model' });

    const out = await provider.respond({
      text: 'How much did I spend in October?',
      history: [{ role: 'assistant', content: 'Hi! Ask me anything.' }],
      executor,
      systemInstruction: 'You are Kosha Copilot.',
      toolDeclarations: [{ name: 'get_summary', description: 'x', parametersJsonSchema: { type: 'object' } }],
    });

    expect(executor.run).toHaveBeenCalledWith('get_summary', { month: '2026-10' });
    expect(out).toMatchObject({
      provider: 'gemini',
      reply: 'You spent ₹37,000.00 in October.',
      data: { kind: 'summary' },
      toolCalls: ['get_summary'],
    });

    const first = generateContent.mock.calls[0][0];
    expect(first.model).toBe('test-model');
    expect(first.config.systemInstruction).toBe('You are Kosha Copilot.');
    expect(first.config.tools[0].functionDeclarations[0].name).toBe('get_summary');
    expect(first.contents[0]).toEqual({ role: 'model', parts: [{ text: 'Hi! Ask me anything.' }] });
    expect(first.contents.at(-1)).toEqual({ role: 'user', parts: [{ text: 'How much did I spend in October?' }] });

    const second = generateContent.mock.calls[1][0].contents;
    expect(second.at(-2).role).toBe('model');
    expect(second.at(-1).parts[0].functionResponse).toMatchObject({
      id: 'c1',
      name: 'get_summary',
      response: { result: { expense: '₹37,000.00' } },
    });
  });

  it('surfaces a pending action proposed by a tool', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'propose_transaction', args: { amount_rupees: 450 } }],
        ...modelTurn([{ functionCall: { name: 'propose_transaction', args: { amount_rupees: 450 } } }]),
      })
      .mockResolvedValueOnce({ text: 'Drafted. Tap Confirm to save.', ...modelTurn([{ text: 'ok' }]) });

    const pendingAction = { type: 'create_transaction', payload: { amount: 45000 } };
    const executor = { run: vi.fn().mockResolvedValue({ result: { status: 'awaiting_confirmation' }, pendingAction }) };
    const provider = createGeminiProvider({ client: { models: { generateContent } }, model: 'm' });

    const out = await provider.respond({ text: 'add 450 groceries', history: [], executor, systemInstruction: '', toolDeclarations: [] });
    expect(out.pendingAction).toEqual(pendingAction);
  });

  it('reports tool errors back to the model instead of crashing', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'get_summary', args: {} }],
        ...modelTurn([{ functionCall: { name: 'get_summary', args: {} } }]),
      })
      .mockResolvedValueOnce({ text: 'Sorry, I could not load that.', ...modelTurn([{ text: '…' }]) });
    const executor = { run: vi.fn().mockRejectedValue(new Error('boom')) };
    const provider = createGeminiProvider({ client: { models: { generateContent } }, model: 'm' });

    const out = await provider.respond({ text: 'summary', history: [], executor, systemInstruction: '', toolDeclarations: [] });
    expect(out.reply).toBe('Sorry, I could not load that.');
    const sent = generateContent.mock.calls[1][0].contents.at(-1).parts[0].functionResponse.response;
    expect(sent).toEqual({ error: 'boom' });
  });

  it('stops after too many tool rounds', async () => {
    const loop = {
      functionCalls: [{ name: 'get_summary', args: {} }],
      ...modelTurn([{ functionCall: { name: 'get_summary', args: {} } }]),
    };
    const generateContent = vi.fn().mockResolvedValue(loop);
    const executor = { run: vi.fn().mockResolvedValue({ result: {} }) };
    const provider = createGeminiProvider({ client: { models: { generateContent } }, model: 'm', maxRounds: 3 });

    const out = await provider.respond({ text: 'x', history: [], executor, systemInstruction: '', toolDeclarations: [] });
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(out.reply).toMatch(/try rephrasing/i);
  });

  it('propagates API failures so the agent can fall back', async () => {
    const generateContent = vi.fn().mockRejectedValue(Object.assign(new Error('quota'), { status: 429 }));
    const provider = createGeminiProvider({ client: { models: { generateContent } }, model: 'm' });
    await expect(
      provider.respond({ text: 'x', history: [], executor: { run: vi.fn() }, systemInstruction: '', toolDeclarations: [] }),
    ).rejects.toThrow('quota');
  });
});
