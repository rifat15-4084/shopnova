import type { Request } from 'express';
import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';

const REFRESH_COOKIE = 'sn_refresh';

/**
 * Production always ships `Secure` + `SameSite=None` so the refresh cookie
 * survives the cross-site hop (e.g. Vercel storefront → API host). In
 * development COOKIE_SECURE=true can still opt in to the strict settings.
 */
const cookieSecure = isProd || env.COOKIE_SECURE;
const cookieSameSite = cookieSecure ? 'none' : 'lax';

export function setRefreshCookie(res: any, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    signed: false,
  });
}

export function clearRefreshCookie(res: any) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/api/auth',
  });
}

export function getRefreshCookie(req: Request): string | null {
  const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (!raw) return null;
  // Guard against cookie-parser signing mismatch noise
  return typeof raw === 'string' && raw.length > 20 ? raw : null;
}

export { REFRESH_COOKIE };
export const log = logger;
