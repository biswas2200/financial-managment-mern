import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', requireAuth, categoryRoutes);

export default router;
