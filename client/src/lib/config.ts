/**
 * Single source of truth for the API base URL.
 *
 *  - `VITE_API_URL` always wins — it is inlined at BUILD time, so it must be
 *    set before `vite build` runs and requires a redeploy after changes.
 *  - In development only, fall back to the local API server.
 *  - In production with no `VITE_API_URL`, the base stays `''` (same-origin),
 *    which is correct when the API is served from the same host
 *    (e.g. the Vercel `/api` rewrite → serverless function).
 */
const DEV_FALLBACK = 'http://localhost:5000';

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  (import.meta.env.DEV ? DEV_FALLBACK : '');
