/**
 * Vercel serverless function entrypoint (auto-detected from the /api directory).
 * vercel.json rewrites `/api/*` here; the Express app lives in server/src.
 */
export { default } from '../server/src/vercel.js';
