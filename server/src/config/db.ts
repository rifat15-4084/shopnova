import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, {
    autoIndex: !isProdAutoIndexOff(),
  });
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

function isProdAutoIndexOff() {
  // In production, indexes are managed explicitly (MIGRATE_AUTO_INDEX=false to disable)
  return process.env.MIGRATE_AUTO_INDEX === 'false';
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
