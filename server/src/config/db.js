import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function databaseState() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}
