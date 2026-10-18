import { env } from '../config/env.js';
import { Order, type OrderDoc } from '../models/Order.js';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { ApiError } from '../utils/errors.js';
import { round2 } from '../utils/crypto.js';
import { cartService } from './cart.service.js';
import { validateCoupon } from './coupon.service.js';
import { computeShipping, computeTax, getShippingConfig } from './pricing.service.js';
import { paymentProviders } from './payment/index.js';
import { mailService } from './mail.service.js';

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  upazila?: string;
  postalCode?: string;
  country?: string;
}

export interface PreparedOrder {
  itemsSubtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  items: Array<{
    product: string;
    title: string;
    slug: string;
    image: string;
    sku: string;
    variantId: string | null;
    variantLabel: string;
    price: number;
    qty: number;
    lineTotal: number;
  }>;
}

function genOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear().toString().slice(2);
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `SN-${y}${m}${d}-${rand}`;
}

/** Recompute every money figure from the DATABASE cart. Client prices are never trusted. */
export async function prepareOrder(
  userId: string,
  opts: { couponCode?: string | null } = {},
): Promise<PreparedOrder> {
  const cart = await cartService.resolve(userId);
  if (cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  for (const item of cart.items) {
    if (item.availableStock < item.qty) {
      throw ApiError.badRequest(`Not enough stock for "${item.title}" (only ${item.availableStock} left)`);
    }
  }

  const config = getShippingConfig();
  const currency = env.DEFAULT_CURRENCY.toLowerCase();
  const subtotal = cart.subtotal;

  let discount = 0;
  let couponCode: string | null = null;
  const requestedCode = opts.couponCode ?? cart.couponCode;
  if (requestedCode) {
    const { result } = await validateCoupon(requestedCode, subtotal, {
      userId,
      productIds: cart.items.map((i) => i.productId),
    });
    discount = result.discount;
    couponCode = result.code;
  }

  const discountedSubtotal = round2(subtotal - discount);
  const shippingCost = computeShipping(discountedSubtotal, config);
  const tax = computeTax(discountedSubtotal, config);
  const total = round2(discountedSubtotal + shippingCost + tax);

  return {
    itemsSubtotal: subtotal,
    shippingCost,
    tax,
    discount,
    total,
    currency,
    couponCode,
    items: cart.items.map((i) => ({
      product: i.productId,
      title: i.title,
      slug: i.slug,
      image: i.image,
      sku: i.sku,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      price: i.unitPrice,
      qty: i.qty,
      lineTotal: i.lineTotal,
    })),
  };
}

export interface CreateOrderOptions {
  userId: string;
  paymentMethod: 'stripe' | 'cod' | 'bkash';
  shippingAddress: ShippingAddressInput;
  couponCode?: string | null;
  /** Set when the order is created from a Stripe webhook/checkout session */
  stripeSessionId?: string | null;
  reduceStock?: boolean;
}

export const checkoutService = {
  prepare: prepareOrder,

  async createStripeSession(userId: string, shippingAddress: ShippingAddressInput, couponCode?: string | null) {
    const provider = paymentProviders.stripe;
    if (!provider.isAvailable()) {
      throw ApiError.badRequest('Stripe payments are not configured. Please use Cash on Delivery.');
    }

    const prepared = await prepareOrder(userId, { couponCode });
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized();

    // Persist the order as PENDING before handing off to Stripe so the webhook
    // can find it by session id.
    const order = await Order.create({
      orderNumber: genOrderNumber(),
      user: user._id,
      items: prepared.items,
      shippingAddress,
      paymentMethod: 'stripe',
      paymentStatus: 'unpaid',
      itemsSubtotal: prepared.itemsSubtotal,
      shippingCost: prepared.shippingCost,
      tax: prepared.tax,
      discount: prepared.discount,
      total: prepared.total,
      currency: prepared.currency,
      couponCode: prepared.couponCode,
      status: 'pending',
      timeline: [{ status: 'pending', note: 'Order created', at: new Date() }],
    });

    const payment = await provider.createPayment({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      amount: prepared.total,
      currency: prepared.currency,
      customerEmail: user.email,
      successUrl: `${env.CLIENT_URL}/checkout/success?order=${order.orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.CLIENT_URL}/checkout/cancel?order=${order.orderNumber}`,
      metadata: { userId },
    });

    order.stripeSessionId = payment.sessionId ?? null;
    order.stripePaymentIntentId = payment.paymentIntentId ?? null;
    await order.save();

    return { orderId: String(order._id), orderNumber: order.orderNumber, url: payment.url, session: payment.sessionId };
  },

  /**
   * COD (and bKash stub): create the order and reserve stock immediately.
   */
  async createLocalOrder(userId: string, input: Omit<CreateOrderOptions, 'reduceStock'>) {
    const provider = paymentProviders[input.paymentMethod];
    if (!provider.isAvailable()) {
      throw ApiError.badRequest(`Payment method "${input.paymentMethod}" is not available`);
    }

    const prepared = await prepareOrder(userId, { couponCode: input.couponCode });

    const { reserveStock, consumeCoupon, releaseStock } = await import('./inventory.service.js');
    const stockItems = prepared.items.map((i) => ({
      product: i.product,
      variantId: i.variantId,
      qty: i.qty,
    }));

    const reserved = await reserveStock(stockItems);
    if (!reserved.ok) {
      throw ApiError.badRequest(`Not enough stock for "${reserved.failedItem}". Please adjust your cart.`);
    }

    try {
      const order = await Order.create({
        orderNumber: genOrderNumber(),
        user: userId,
        items: prepared.items,
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'cod' ? 'unpaid' : 'paid',
        itemsSubtotal: prepared.itemsSubtotal,
        shippingCost: prepared.shippingCost,
        tax: prepared.tax,
        discount: prepared.discount,
        total: prepared.total,
        currency: prepared.currency,
        couponCode: prepared.couponCode,
        status: 'pending',
        stockReversed: false,
        timeline: [
          {
            status: 'pending',
            note:
              input.paymentMethod === 'cod'
                ? 'Order placed — pay with cash on delivery'
                : 'Order placed',
            at: new Date(),
          },
        ],
      });
      await consumeCoupon(order.couponCode ?? null);
      await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null } });

      const user = await User.findById(userId);
      if (user) {
        void mailService.sendOrderConfirmation(
          user.email,
          user.name,
          order.orderNumber,
          order.total,
          order.currency,
        );
      }
      return order;
    } catch (err) {
      await releaseStock(stockItems);
      throw err;
    }
  },
};

export type { OrderDoc };
