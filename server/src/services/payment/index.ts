import type Stripe from 'stripe';
import { getStripe, stripeEnabled } from '../../config/stripe.js';

export interface PaymentIntentLike {
  provider: 'stripe' | 'cod' | 'bkash';
  sessionId?: string;
  paymentIntentId?: string;
  url?: string;
  raw?: unknown;
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

/**
 * Every payment method implements this interface so new providers
 * (bKash, Nagad, SSLCommerz…) can be dropped in without touching checkout logic.
 */
export interface PaymentProvider {
  readonly name: 'stripe' | 'cod' | 'bkash';
  isAvailable(): boolean;
  /** Create whatever is needed to capture payment for a prepared order. */
  createPayment(input: {
    orderId: string;
    orderNumber: string;
    amount: number; // major units, e.g. 99.99
    currency: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntentLike>;
  refund(input: {
    paymentIntentId?: string | null;
    amount?: number;
    reason?: string;
  }): Promise<RefundResult>;
}

/* ───────────────────────────── Stripe ───────────────────────────── */

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;

  isAvailable(): boolean {
    return stripeEnabled();
  }

  async createPayment(input: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntentLike> {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Prices are created ad-hoc from the SERVER-COMPUTED order total —
      // the client can never influence what Stripe charges.
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: `ShopNova order ${input.orderNumber}`,
              description: 'Thank you for shopping with ShopNova!',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber, ...(input.metadata ?? {}) },
    });

    return {
      provider: 'stripe',
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      url: session.url ?? undefined,
      raw: session,
    };
  }

  async refund(input: { paymentIntentId?: string | null; amount?: number; reason?: string }): Promise<RefundResult> {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: 'Stripe is not configured' };
    try {
      const refund = await stripe.refunds.create({
        payment_intent: input.paymentIntentId as string,
        amount: input.amount ? Math.round(input.amount * 100) : undefined,
        reason: 'requested_by_customer',
      });
      return { ok: refund.status === 'succeeded' || refund.status === 'pending', refundId: refund.id, amount: input.amount };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Refund failed' };
    }
  }
}

/* ───────────────────────── Cash on Delivery ───────────────────────── */

export class CodPaymentProvider implements PaymentProvider {
  readonly name = 'cod' as const;

  isAvailable(): boolean {
    return true;
  }

  async createPayment(): Promise<PaymentIntentLike> {
    // Nothing to capture now — the courier collects payment on delivery.
    return { provider: 'cod' };
  }

  async refund(): Promise<RefundResult> {
    // COD refunds happen in cash/offline; the admin records them manually.
    return { ok: true, refundId: `cod-manual-${Date.now()}` };
  }
}

/* ──────────────────────── bKash (sandbox stub) ──────────────────────── */

/**
 * Stub for the bKash Tokenized Checkout sandbox.
 * Implements the same interface so wiring the real API only requires filling
 * in the HTTP calls below (POST /tokenized/checkout/create etc.).
 */
export class BkashPaymentProvider implements PaymentProvider {
  readonly name = 'bkash' as const;

  isAvailable(): boolean {
    // Flip to true once BKASH_* env vars and real calls are implemented.
    return process.env.BKASH_ENABLED === 'true';
  }

  async createPayment(input: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentIntentLike> {
    // Sandbox stub: emulate a redirect URL shape so the frontend flow is testable.
    const stubId = `bkash-stub-${input.orderId}`;
    return {
      provider: 'bkash',
      sessionId: stubId,
      url: `${input.cancelUrl}?provider=bkash&status=stub&session_id=${stubId}`,
    };
  }

  async refund(): Promise<RefundResult> {
    return { ok: false, error: 'bKash refunds are not implemented in the sandbox stub' };
  }
}

export const paymentProviders: Record<'stripe' | 'cod' | 'bkash', PaymentProvider> = {
  stripe: new StripePaymentProvider(),
  cod: new CodPaymentProvider(),
  bkash: new BkashPaymentProvider(),
};

export function availablePaymentMethods(): Array<'stripe' | 'cod' | 'bkash'> {
  return (['stripe', 'cod', 'bkash'] as const).filter((k) => paymentProviders[k].isAvailable());
}

export type { Stripe };
