/**
 * Central configuration. Every setting comes from environment variables
 * (server/.env in development) with safe local defaults.
 */

const num = (value, fallback) => (value === undefined || value === '' ? fallback : Number(value));

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isTest = nodeEnv === 'test';
const isProd = nodeEnv === 'production';

const DEV_MONGO_URI = 'mongodb://kosha:kosha_dev_pw@localhost:27017/kosha?authSource=admin';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const env = Object.freeze({
  nodeEnv,
  isTest,
  isProd,
  // API_PORT (not PORT) so tools that inject PORT for the web dev server don't collide.
  port: num(process.env.API_PORT, 5000),
  mongoUri: isTest ? process.env.MONGO_URI_TEST : process.env.MONGO_URI || DEV_MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'kosha-local-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
});
