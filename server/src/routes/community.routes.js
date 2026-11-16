import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { postSchema, commentSchema, reactionSchema, postListQuery, commentListQuery } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { idParams } from '../utils/ids.js';
import { env } from '../config/env.js';
import * as community from '../controllers/community.controller.js';

const router = Router();

/** Writing is limited per member so one account cannot flood the community. */
const writeLimiter = (limit, what) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    keyGenerator: (req) => String(req.user?._id ?? req.ip),
    skip: () => env.isTest,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: `You are ${what} too quickly. Try again in a minute.` } },
  });

router.get('/posts', validate({ query: postListQuery }), community.listPosts);
router.post('/posts', writeLimiter(6, 'posting'), validate({ body: postSchema }), community.createPost);
router.get('/posts/:id', validate({ params: idParams }), community.getPost);
router.delete('/posts/:id', validate({ params: idParams }), community.deletePost);

router.get('/comments', validate({ query: commentListQuery }), community.listComments);
router.post('/comments', writeLimiter(20, 'commenting'), validate({ body: commentSchema }), community.addComment);
router.delete('/comments/:id', validate({ params: idParams }), community.deleteComment);

router.put('/reactions', writeLimiter(120, 'reacting'), validate({ body: reactionSchema }), community.react);

export default router;
