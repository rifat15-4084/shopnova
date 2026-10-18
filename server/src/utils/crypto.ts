import { randomBytes, createHash } from 'crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
