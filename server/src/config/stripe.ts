import Stripe from 'stripe';
import { env } from './env.js';
import { logger } from './logger.js';

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'ShopNova', version: '1.0.0' },
    });
  }
  return stripe;
}

export function stripeEnabled(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_'));
}

if (!stripeEnabled() && env.NODE_ENV !== 'test') {
  logger.warn('Stripe is not configured — only Cash on Delivery will be available.');
}
