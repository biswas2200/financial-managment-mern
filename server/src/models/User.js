import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { toJSONPlugin } from './plugins/toJSON.js';

// Profile picture: either an icon + colour, or a small photo kept as a data URL.
const avatarSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['preset', 'image'], required: true },
    preset: String,
    color: String,
    image: String,
  },
  { _id: false },
);

// Which version of the Terms and Privacy Policy the user accepted, and when.
const consentSchema = new mongoose.Schema({ termsVersion: String, acceptedAt: Date }, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    phone: { type: String, trim: true }, // E.164, optional
    dateOfBirth: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD, optional
    avatar: avatarSchema,
    consent: consentSchema,
    // Money the user already had before Kosha. Balance = openingBalance + income - expenses (paise, may be negative).
    openingBalance: { type: Number, default: 0 },
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
