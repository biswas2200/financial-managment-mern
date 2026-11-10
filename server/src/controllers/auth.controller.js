import * as authService from '../services/auth.service.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

export async function register(req, res) {
  const user = await authService.register(req.valid.body);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
}

export async function login(req, res) {
  const user = await authService.login(req.valid.body);
  setAuthCookie(res, signToken(user.id));
  res.json({ user });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res) {
  const user = await authService.updateProfile(req.user._id, req.valid.body);
  res.json({ user });
}

export async function changePassword(req, res) {
  await authService.changePassword(req.user._id, req.valid.body);
  res.status(204).end();
}
