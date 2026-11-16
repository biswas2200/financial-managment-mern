import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { FUND_CATEGORIES } from '../markets/universe.js';

const symbolParams = z.object({ symbol: z.string().trim().regex(/^[A-Za-z0-9&-]{1,20}$/, 'Invalid stock symbol') });
const nameParams = z.object({ name: z.string().trim().min(1).max(60) });
const codeParams = z.object({ code: z.coerce.number({ invalid_type_error: 'Invalid scheme code' }).int('Invalid scheme code').positive('Invalid scheme code') });
const searchQuery = z.object({ q: z.string({ required_error: 'Type at least 2 characters' }).trim().min(2, 'Type at least 2 characters').max(40, 'That search is too long') });
const categoryQuery = z.object({ category: z.enum(FUND_CATEGORIES.map((c) => c.id), { errorMap: () => ({ message: 'Choose one of the fund categories' }) }) });

/** Read-only market data. The service is injected so tests can feed it fake files. */
export function marketsRoutes(markets) {
  const router = Router();

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
