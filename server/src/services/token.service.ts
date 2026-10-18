import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { randomToken, sha256 } from '../utils/crypto.js';

export interface AccessTokenPayload {
  sub: string; // user id
  role: 'customer' | 'admin';
  name: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
    issuer: 'shopnova',
    audience: 'shopnova-api',
    // Unique token id so two tokens issued in the same second differ
    jwtid: randomToken(8),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'shopnova',
    audience: 'shopnova-api',
  }) as jwt.JwtPayload & AccessTokenPayload;
  return { sub: decoded.sub as string, role: decoded.role, name: decoded.name };
}

/** Refresh tokens are opaque random strings; only their hash is stored server-side. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomToken(48);
  return { token, hash: sha256(token) };
}

export function hashRefreshToken(token: string): string {
  return sha256(token);
}

export function signPasswordResetToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: 'password-reset' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '1h',
    issuer: 'shopnova',
    audience: 'shopnova-password-reset',
  });
}

export function verifyPasswordResetToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'shopnova',
    audience: 'shopnova-password-reset',
  }) as jwt.JwtPayload;
  return decoded.sub as string;
}
