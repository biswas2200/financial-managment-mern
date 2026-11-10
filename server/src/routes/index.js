import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/transactions', requireAuth, transactionRoutes);
router.use('/budgets', requireAuth, budgetRoutes);
router.use('/analytics', requireAuth, analyticsRoutes);

export default router;
