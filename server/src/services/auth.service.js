import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { seedDefaultCategories } from './category.service.js';

export async function register({ name, email, password }) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('This email is already registered. Try signing in instead.');
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
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

export async function updateProfile(userId, { name }) {
  return User.findByIdAndUpdate(userId, { name }, { new: true, runValidators: true });
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
