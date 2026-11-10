import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Connects to the dedicated `kosha_test` database (Docker MongoDB), builds indexes,
 * and wipes every collection before each test so tests never depend on each other.
 */
export function useTestDatabase() {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI_TEST);
    }
    await mongoose.connection.syncIndexes();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}
