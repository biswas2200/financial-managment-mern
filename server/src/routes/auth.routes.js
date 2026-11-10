import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '@kosha/shared';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

// Slow down password guessing: 30 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes.' } },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), auth.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), auth.updateMe);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), auth.changePassword);

export default router;
