import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    currency: { type: String, default: 'INR', enum: ['INR'] },
  },
  { timestamps: true },
);

userSchema.plugin(toJSONPlugin);

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
