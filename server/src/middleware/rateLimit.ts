import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

function limiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message, code: 'TOO_MANY_REQUESTS' } },
  });
}

export const generalLimiter = limiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX,
  'Too many requests, please try again later.',
);

export const authLimiter = limiter(
  15 * 60 * 1000,
  env.AUTH_RATE_LIMIT_MAX,
  'Too many authentication attempts, please try again in 15 minutes.',
);

export const checkoutLimiter = limiter(15 * 60 * 1000, 30, 'Too many checkout attempts, slow down.');
export const reviewLimiter = limiter(60 * 60 * 1000, 20, 'Too many reviews submitted, try again later.');
