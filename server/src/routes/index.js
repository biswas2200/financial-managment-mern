import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAgent } from '../agent/agent.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import balanceRoutes from './balance.routes.js';
import analyticsRoutes from './analytics.routes.js';
import communityRoutes from './community.routes.js';
import learnRoutes from './learn.routes.js';
import { assistantRoutes } from './assistant.routes.js';
import { marketsRoutes } from './markets.routes.js';
import { watchlistRoutes } from './watchlist.routes.js';
import { createMarketService } from '../markets/service.js';
import { offline } from '../markets/http.js';
import { env } from '../config/env.js';

/** Mounts every /api/v1 resource. Everything except /auth requires a session. */
export function createApiRouter(options = {}) {
  const router = Router();
  // Tests never reach the real network: without a fake they get a data source that is always unreachable.
  const markets = options.markets ?? createMarketService(env.isTest ? { fetchBuffer: offline, fetchJson: offline } : {});

  router.use('/auth', authRoutes);
  router.use('/categories', requireAuth, categoryRoutes);
  router.use('/transactions', requireAuth, transactionRoutes);
  router.use('/budgets', requireAuth, budgetRoutes);
  router.use('/analytics', requireAuth, analyticsRoutes);
  router.use('/balance', requireAuth, balanceRoutes);
  router.use('/learn', requireAuth, learnRoutes);
  router.use('/community', requireAuth, communityRoutes);
  router.use('/markets', requireAuth, marketsRoutes(markets));
  router.use('/watchlist', requireAuth, watchlistRoutes(markets));
  router.use('/assistant', requireAuth, assistantRoutes(createAgent({ ...options.assistant, markets })));

  return router;
}
