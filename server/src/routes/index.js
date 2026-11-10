import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/transactions', requireAuth, transactionRoutes);
router.use('/budgets', requireAuth, budgetRoutes);

export default router;
