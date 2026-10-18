import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';

const app = createApp();

/**
 * One connection per lambda instance, reused across warm invocations.
 * On failure the promise is cleared so the next request retries a fresh connect.
 */
let connection: Promise<unknown> | null = null;
function ensureDb(): Promise<unknown> {
  connection ??= connectDB().catch((err: unknown) => {
    connection = null;
    throw err;
  });
  return connection;
}

/**
 * Vercel serverless entrypoint (@vercel/node).
 * vercel.json rewrites same-origin `/api/*` requests here; the Express app
 * still sees the original `/api/...` paths, so all mounts work unchanged.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  ensureDb()
    .then(() => app(req, res))
    .catch((err: unknown) => {
      logger.error({ err }, 'MongoDB connection failed');
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: { message: 'Database unavailable, please try again.', code: 'DB_UNAVAILABLE' },
          }),
        );
      }
    });
}
