import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  try {
    await connectDatabase(env.mongoUri);
    console.log('[kosha] Connected to MongoDB');
  } catch (err) {
    console.error('[kosha] Could not connect to MongoDB. Is Docker running? (docker compose up -d)');
    console.error(err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[kosha] API listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[kosha] ${signal} received, shutting down`);
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
