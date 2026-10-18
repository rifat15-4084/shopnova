import { asyncHandler } from '../utils/asyncHandler.js';
import { cartService } from '../services/cart.service.js';
import { checkoutService } from '../services/checkout.service.js';
import { orderService } from '../services/order.service.js';
import { validateCoupon } from '../services/coupon.service.js';
import { getShippingConfig } from '../services/pricing.service.js';
import { paymentProviders, availablePaymentMethods } from '../services/payment/index.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const cartController = {
  get: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.resolve(req.user!.id);
    res.json({ cart });
  }),

  addItem: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.addItem(req.user!.id, req.body);
    res.status(201).json({ cart });
  }),

  updateItem: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.updateItem(req.user!.id, req.body);
    res.json({ cart });
  }),

  removeItem: asyncHandler(async (req: AuthedRequest, res) => {
    const variantId = (req.query.variantId as string) || null;
    const cart = await cartService.removeItem(req.user!.id, req.params.productId, variantId);
    res.json({ cart });
  }),

  clear: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.clear(req.user!.id);
    res.json({ cart });
  }),

  setCoupon: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.setCoupon(req.user!.id, req.body.code ?? null);
    res.json({ cart });
  }),
};

export const checkoutController = {
  config: asyncHandler(async (_req, res) => {
    const config = getShippingConfig();
    res.json({
      freeShippingThreshold: config.freeThreshold,
      flatShippingRate: config.flatRate,
      taxRate: config.taxRate,
      currency: config.defaultCurrency,
      paymentMethods: availablePaymentMethods(),
    });
  }),

  /** Server-side price recomputation — the client's totals are never trusted. */
  preview: asyncHandler(async (req: AuthedRequest, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    const prepared = await checkoutService.prepare(req.user!.id, {
      couponCode: (query.couponCode as string) ?? null,
    });
    res.json({ preview: prepared });
  }),

  createSession: asyncHandler(async (req: AuthedRequest, res) => {
    const { shippingAddress, couponCode } = req.body;
    const result = await checkoutService.createStripeSession(req.user!.id, shippingAddress, couponCode);
    res.status(201).json(result);
  }),

  placeOrder: asyncHandler(async (req: AuthedRequest, res) => {
    const { paymentMethod, shippingAddress, couponCode } = req.body;
    const order = await checkoutService.createLocalOrder(req.user!.id, {
      userId: req.user!.id,
      paymentMethod,
      shippingAddress,
      couponCode: couponCode ?? null,
    });
    res.status(201).json({ order });
  }),

  validateCoupon: asyncHandler(async (req: AuthedRequest, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    const code = query.code ?? (req.body?.code as string);
    if (!code) throw ApiError.badRequest('Coupon code is required');
    const cart = await cartService.resolve(req.user!.id);
    if (cart.subtotal <= 0) throw ApiError.badRequest('Your cart is empty');
    const { result } = await validateCoupon(String(code), cart.subtotal, {
      userId: req.user!.id,
      productIds: cart.items.map((i) => i.productId),
    });
    res.json({ coupon: result });
  }),
};

export const orderController = {
  mine: asyncHandler(async (req: AuthedRequest, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    const result = await orderService.listForUser(req.user!.id, query);
    res.json(result);
  }),

  get: asyncHandler(async (req: AuthedRequest, res) => {
    const order = await orderService.getById(req.params.id, req.user!);
    res.json({ order });
  }),

  getByNumber: asyncHandler(async (req: AuthedRequest, res) => {
    const order = await orderService.findByOrderNumber(req.params.orderNumber, req.user!);
    res.json({ order });
  }),

  cancel: asyncHandler(async (req: AuthedRequest, res) => {
    const order = await orderService.cancel(req.params.id, req.user!, req.body?.reason ?? '');
    res.json({ order });
  }),

  invoice: asyncHandler(async (req: AuthedRequest, res) => {
    const order = await orderService.getById(req.params.id, req.user!);
    res.set('Cache-Control', 'no-store');
    res.json({
      invoice: {
        number: `INV-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        issuedAt: order.createdAt,
        seller: {
          name: 'ShopNova',
          address: 'Gulshan Avenue, Dhaka 1212, Bangladesh',
          email: 'support@shopnova.dev',
          phone: '+880 1700-000000',
        },
        buyer: order.shippingAddress,
        items: order.items,
        totals: {
          itemsSubtotal: order.itemsSubtotal,
          shipping: order.shippingCost,
          tax: order.tax,
          discount: order.discount,
          total: order.total,
          currency: order.currency,
        },
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          paidAt: order.paidAt ?? null,
        },
      },
    });
  }),
};

export const webhookController = {
  /**
   * Stripe webhook — mounted with express.raw() BEFORE the JSON body parser.
   * Idempotent: repeated deliveries of the same event never double-charge,
   * double-reduce stock, or clear the cart twice.
   */
  stripe: asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const stripe = paymentProviders.stripe;
    if (!stripe.isAvailable() || !signature) {
      throw ApiError.badRequest('Stripe webhooks are not configured');
    }

    const { getStripe } = await import('../config/stripe.js');
    const { env } = await import('../config/env.js');
    const stripeClient = getStripe()!;

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body as Buffer,
        String(signature),
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      throw ApiError.badRequest(`Webhook signature verification failed: ${err?.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      await handleCheckoutCompleted(session);
    }

    res.json({ received: true });
  }),
};

/**
 * Mark the matching order as paid, reserve stock atomically, clear the cart,
 * and email the customer. Safe to run multiple times for the same session.
 * Exported for the webhook idempotency tests.
 */
export async function handleCheckoutCompleted(session: any) {
  const orderId = session.metadata?.orderId;
  const order = orderId
    ? await Order.findById(orderId)
    : await Order.findOne({ stripeSessionId: session.id });
  if (!order) return;

  // IDEMPOTENCY: only the first successful event transitions the order.
  if (order.paymentStatus === 'paid') return;

  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  order.stripeSessionId = session.id;
  if (session.payment_intent) {
    order.stripePaymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
  }
  order.status = 'paid';
  order.timeline.push({ status: 'paid', note: 'Payment received via Stripe', at: new Date() } as any);
  await order.save();

  // Atomic, oversell-proof stock reservation (with compensation on partial failure)
  const { reserveStock, consumeCoupon } = await import('../services/inventory.service.js');
  const stockItems = (order.items as any[]).map((i) => ({
    product: String(i.product),
    variantId: i.variantId ?? null,
    qty: i.qty,
  }));
  const reserved = await reserveStock(stockItems);
  if (!reserved.ok) {
    order.adminNotes = `Stock reservation failed for "${reserved.failedItem}" after payment. Manual intervention required.`;
    await order.save();
  } else {
    const { bumpSoldCount } = await import('../services/inventory.service.js');
    await bumpSoldCount(stockItems, 1);
  }
  await consumeCoupon(String(order.couponCode ?? ''));

  const { Cart } = await import('../models/Cart.js');
  await Cart.updateOne({ user: order.user }, { $set: { items: [], couponCode: null } });

  const { User } = await import('../models/User.js');
  const { mailService } = await import('../services/mail.service.js');
  const user = await User.findById(order.user);
  if (user) {
    void mailService.sendOrderConfirmation(user.email, user.name, order.orderNumber, order.total, String(order.currency));
  }
}
