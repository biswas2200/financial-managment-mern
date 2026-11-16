import { POLICY_VERSION } from '@kosha/shared';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Category } from '../models/Category.js';
import { Budget } from '../models/Budget.js';
import { AssistantMessage } from '../models/AssistantMessage.js';
import { ApiError } from '../utils/ApiError.js';
import { seedDefaultCategories } from './category.service.js';
import { removeMemberContent } from './community.service.js';

export async function register({ name, email, password, phone, dateOfBirth }) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('This email is already registered. Try signing in instead.');
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    ...(phone ? { phone } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    // The schema only lets registration through once the Terms and Privacy Policy are accepted.
    consent: { termsVersion: POLICY_VERSION, acceptedAt: new Date() },
  });
  await seedDefaultCategories(user._id);
  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await user.verifyPassword(password) : false;
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!valid) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  return user;
}

/** `null` clears an optional field; `undefined` leaves it alone. */
export async function updateProfile(userId, { name, phone, dateOfBirth, avatar }) {
  const $set = { name };
  const $unset = {};
  for (const [field, value] of Object.entries({ phone, dateOfBirth, avatar })) {
    if (value === undefined) continue;
    if (value === null) $unset[field] = 1;
    else $set[field] = value;
  }
  const update = Object.keys($unset).length ? { $set, $unset } : { $set };
  return User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect', [
      { path: 'currentPassword', message: 'Incorrect password' },
    ]);
  }
  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
}

/** Permanently removes the account and everything that belongs to it. Needs the current password. */
export async function deleteAccount(userId, { password }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.badRequest('Your password is incorrect', [{ path: 'password', message: 'Incorrect password' }]);
  }
  await Promise.all([
    Transaction.deleteMany({ user: user._id }),
    Budget.deleteMany({ user: user._id }),
    Category.deleteMany({ user: user._id }),
    AssistantMessage.deleteMany({ user: user._id }),
    removeMemberContent(user._id),
  ]);
  await user.deleteOne();
}
