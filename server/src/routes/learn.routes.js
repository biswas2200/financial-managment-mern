import { Router } from 'express';
import { z } from 'zod';
import { articleListQuery } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import * as learn from '../services/learn.service.js';

const router = Router();
const slugParams = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,80}$/, 'Invalid article') });

router.get('/articles', validate({ query: articleListQuery }), async (req, res) => {
  res.json(await learn.listArticles(req.user._id, req.valid.query));
});

router.get('/articles/:slug', validate({ params: slugParams }), async (req, res) => {
  res.json(await learn.getArticle(req.user._id, req.valid.params.slug));
});

export default router;
