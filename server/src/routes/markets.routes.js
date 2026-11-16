import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { FUND_CATEGORIES } from '../markets/universe.js';

const symbolParams = z.object({ symbol: z.string().trim().regex(/^[A-Za-z0-9&-]{1,20}$/, 'Invalid stock symbol') });
const nameParams = z.object({ name: z.string().trim().min(1).max(60) });
const codeParams = z.object({ code: z.coerce.number({ invalid_type_error: 'Invalid scheme code' }).int('Invalid scheme code').positive('Invalid scheme code').max(999_999_999, 'Invalid scheme code') });
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F]/;
const searchQuery = z.object({
  q: z
    .string({ required_error: 'Type at least 2 characters' })
    .trim()
    .min(2, 'Type at least 2 characters')
    .max(40, 'That search is too long')
    .refine((v) => !CONTROL.test(v), 'That search has characters that cannot be used'),
});
const categoryQuery = z.object({ category: z.enum(FUND_CATEGORIES.map((c) => c.id), { errorMap: () => ({ message: 'Choose one of the fund categories' }) }) });

/** Read-only market data. The service is injected so tests can feed it fake files. */
export function marketsRoutes(markets, { limit = 120, skip = env.isTest } = {}) {
  const router = Router();

  // Every request can fan out to the exchange's and AMFI's servers, so each person gets a fair share per minute.
  router.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit,
      keyGenerator: (req) => String(req.user?._id ?? req.ip),
      skip: () => skip,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'You are asking for market data too quickly. Try again in a minute.' } },
    }),
  );

  router.get('/overview', async (_req, res) => res.json(await markets.overview()));
  router.get('/indices/:name', validate({ params: nameParams }), async (req, res) => res.json(await markets.indexDetail(req.valid.params.name)));

  router.get('/stocks/nifty50', async (_req, res) => res.json(await markets.nifty50()));
  router.get('/stocks/search', validate({ query: searchQuery }), async (req, res) => res.json(await markets.searchStocks(req.valid.query.q)));
  router.get('/stocks/:symbol', validate({ params: symbolParams }), async (req, res) => res.json(await markets.stockDetail(req.valid.params.symbol)));

  router.get('/funds/categories', (_req, res) => res.json(markets.fundCategories()));
  router.get('/funds/search', validate({ query: searchQuery }), async (req, res) => res.json(await markets.searchFunds(req.valid.query.q)));
  router.get('/funds/top', validate({ query: categoryQuery }), async (req, res) => res.json(await markets.topFunds(req.valid.query.category)));
  router.get('/funds/:code', validate({ params: codeParams }), async (req, res) => res.json(await markets.fundDetail(req.valid.params.code)));

  return router;
}
