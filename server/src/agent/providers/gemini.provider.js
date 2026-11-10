/**
 * Google Gemini engine for Kosha Copilot.
 *
 * Uses Gemini function calling: we send the conversation plus tool declarations;
 * when Gemini replies with functionCalls we run those tools against the user's
 * MongoDB data, send the results back as functionResponse parts, and repeat until
 * Gemini answers in plain text.
 */
import { GoogleGenAI } from '@google/genai';

const TOO_MANY_STEPS = 'That took more steps than expected. Please try rephrasing your question.';

export function createGeminiProvider({ apiKey, model, client, maxRounds = 5, temperature = 0.3 } = {}) {
  const ai = client ?? new GoogleGenAI({ apiKey });

  return {
    name: 'gemini',
    model,

    async respond({ text, history = [], executor, systemInstruction, toolDeclarations = [] }) {
      const contents = [
        ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text }] },
      ];
      const config = {
        systemInstruction,
        temperature,
        ...(toolDeclarations.length ? { tools: [{ functionDeclarations: toolDeclarations }] } : {}),
      };

      const toolCalls = [];
      let data;
      let pendingAction;

      for (let round = 0; round < maxRounds; round += 1) {
        const response = await ai.models.generateContent({ model, contents: [...contents], config });
        const calls = response.functionCalls ?? [];

        if (!calls.length) {
          const reply = (response.text ?? '').trim() || "I couldn't find an answer to that. Could you rephrase it?";
          return { provider: 'gemini', reply, data, pendingAction, toolCalls };
        }

        // Keep the model's own turn (it may carry thought signatures) before our responses.
        contents.push(
          response.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c })) },
        );

        const parts = [];
        for (const call of calls) {
          toolCalls.push(call.name);
          let output;
          try {
            const r = await executor.run(call.name, call.args ?? {});
            output = { result: r.result };
            if (r.data) data = r.data;
            if (r.pendingAction) pendingAction = r.pendingAction;
          } catch (err) {
            output = { error: err.message };
          }
          parts.push({ functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: output } });
        }
        contents.push({ role: 'user', parts });
      }

      return { provider: 'gemini', reply: TOO_MANY_STEPS, data, pendingAction, toolCalls };
    },
  };
}
