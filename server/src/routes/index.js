import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAgent } from '../agent/agent.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import analyticsRoutes from './analytics.routes.js';
import { assistantRoutes } from './assistant.routes.js';

/** Mounts every /api/v1 resource. Everything except /auth requires a session. */
export function createApiRouter(options = {}) {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/categories', requireAuth, categoryRoutes);
  router.use('/transactions', requireAuth, transactionRoutes);
  router.use('/budgets', requireAuth, budgetRoutes);
  router.use('/analytics', requireAuth, analyticsRoutes);
  router.use('/assistant', requireAuth, assistantRoutes(createAgent(options.assistant)));

  return router;
}
