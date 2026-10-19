import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { initMail } from './services/mail.service.js';

async function main() {
  await connectDB();
  await initMail();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`🚀 ShopNova API listening on ${env.API_URL} (port ${env.PORT})`);
    logger.info(`📚 API docs: ${env.API_URL}/api/docs`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  // GRACEFUL SHUTDOWN
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully…`);
    const force = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
    force.unref();

    server.close(async () => {
      await disconnectDB();
      logger.info('Closed all connections. Bye 👋');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

void main();
