import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assistantMessageSchema } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import { env } from '../config/env.js';

/** Routes for Kosha Copilot. The agent is injected so tests can swap the Gemini engine. */
export function assistantRoutes(agent) {
  const router = Router();

  const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    keyGenerator: (req) => String(req.user?._id ?? req.ip),
    skip: () => env.isTest,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'You are sending messages too quickly. Try again in a minute.' } },
  });

  router.get('/status', (_req, res) => res.json(agent.status()));

  router.get('/insights', async (req, res) => res.json(await agent.insights(req.user)));

  router.get('/history', async (req, res) => res.json(await agent.history(req.user)));

  router.delete('/history', async (req, res) => {
    await agent.clearHistory(req.user);
    res.status(204).end();
  });

  router.post('/message', messageLimiter, validate({ body: assistantMessageSchema }), async (req, res) => {
    res.json(await agent.handleMessage(req.user, req.valid.body.text));
  });

  router.post('/actions/:id/confirm', validate({ params: idParams }), async (req, res) => {
    res.json(await agent.confirmAction(req.user, req.valid.params.id));
  });

  router.post('/actions/:id/cancel', validate({ params: idParams }), async (req, res) => {
    res.json(await agent.cancelAction(req.user, req.valid.params.id));
  });

  return router;
}
