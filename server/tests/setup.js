// Test environment defaults. Real values never come from server/.env during tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-used-anywhere-else';
process.env.BCRYPT_ROUNDS = '4';
process.env.GEMINI_API_KEY = '';
process.env.MONGO_URI_TEST ??=
  'mongodb://kosha:kosha_dev_pw@localhost:27017/kosha_test?authSource=admin';
