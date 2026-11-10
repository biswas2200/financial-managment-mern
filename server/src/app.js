import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { databaseState } from './config/db.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

/**
 * Builds the Express application without starting a server,
 * so tests can drive it in-process with supertest.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: databaseState(), uptime: process.uptime() });
  });

  app.use('/api/v1', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
