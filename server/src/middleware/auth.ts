import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../services/token.service.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/errors.js';

export interface AuthedRequest extends Request {
  user?: AccessTokenPayload & { id: string };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export async function authenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized('Missing access token');
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('isActive role name email');
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
    req.user = { ...payload, id: String(user._id), role: user.role as 'customer' | 'admin' };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

/** Optional auth — attaches req.user when a valid token is present, never fails. */
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('isActive role name email');
    if (user?.isActive) {
      req.user = { ...payload, id: String(user._id), role: user.role as 'customer' | 'admin' };
    }
  } catch {
    /* ignore */
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, next);
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.user?.role !== 'admin') return next(ApiError.forbidden('Admin access required'));
    next();
  });
}
