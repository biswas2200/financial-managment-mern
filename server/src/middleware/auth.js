import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

export const AUTH_COOKIE = 'kosha_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true, // not readable from JavaScript → safe from XSS token theft
  sameSite: 'lax', // not sent on cross-site POSTs → CSRF protection
  secure: env.isProd,
  path: '/',
});

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

function readToken(req) {
  const fromCookie = req.cookies?.[AUTH_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Rejects the request with 401 unless it carries a valid session token. */
export async function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized();

  req.user = user;
  next();
}
