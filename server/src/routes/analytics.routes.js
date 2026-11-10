import { Router } from 'express';
import { z } from 'zod';
import { rangeQuerySchema, monthKey } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import * as analytics from '../services/analytics.service.js';

const router = Router();

const query = rangeQuerySchema.extend({
  end: monthKey.optional(),
  top: z.coerce.number().int().min(1).max(8).default(4),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

const handle = (fn) => async (req, res) => res.json(await fn(req.user._id, req.valid.query));

router.get('/summary', validate({ query }), handle(analytics.getSummary));
router.get('/by-category', validate({ query }), handle(analytics.getByCategory));
router.get('/trend', validate({ query }), handle(analytics.getTrend));
router.get('/daily', validate({ query }), handle(analytics.getDaily));
router.get('/weekday', validate({ query }), handle(analytics.getWeekday));
router.get('/merchants', validate({ query }), handle(analytics.getMerchants));
router.get('/category-trend', validate({ query }), handle(analytics.getCategoryTrend));

export default router;
