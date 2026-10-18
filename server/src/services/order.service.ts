import type { Types } from 'mongoose';
import { Order, type OrderDoc, type OrderStatus } from '../models/Order.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/errors.js';
import { normalizePagination, paginate, type PaginationResult } from '../utils/pagination.js';
import {
  reserveStock,
  releaseStock,
  orderItemsForStock,
  releaseCoupon,
  bumpSoldCount,
} from './inventory.service.js';
import { paymentProviders } from './payment/index.js';
import { mailService } from './mail.service.js';
import { logger } from '../config/logger.js';

export const CANCELABLE: OrderStatus[] = ['pending', 'paid'];

export const orderService = {
  async listForUser(
    userId: string,
    query: { page?: number; limit?: number; status?: string },
  ): Promise<PaginationResult<OrderDoc>> {
    const { page, limit, skip } = normalizePagination(query, 50);
    const filter: Record<string, unknown> = { user: userId };
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },

  async getById(orderId: string, requester: { id: string; role: string }): Promise<OrderDoc> {
    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) throw ApiError.notFound('Order not found');
    const isOwner = String(order.user && (order.user as any)._id
      ? (order.user as any)._id
      : order.user) === requester.id;
    if (!isOwner && requester.role !== 'admin') throw ApiError.forbidden('Not your order');
    return order;
  },

  async findByOrderNumber(orderNumber: string, requester: { id: string; role: string }) {
    const order = await Order.findOne({ orderNumber }).populate('user', 'name email');
    if (!order) throw ApiError.notFound('Order not found');
    const ownerId = order.user && (order.user as any)._id ? String((order.user as any)._id) : String(order.user);
    if (ownerId !== requester.id && requester.role !== 'admin') throw ApiError.forbidden('Not your order');
    return order;
  },

  async cancel(orderId: string, requester: { id: string; role: string }, reason = '') {
    const order = await Order.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');
    const ownerId = String(order.user);
    if (ownerId !== requester.id && requester.role !== 'admin') throw ApiError.forbidden('Not your order');
    if (!CANCELABLE.includes(order.status)) {
      throw ApiError.badRequest(`An order with status "${order.status}" can no longer be cancelled`);
    }
    if ((order.trackingNumber ?? '').length > 0) {
      throw ApiError.badRequest('This order has already shipped');
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    order.timeline.push({ status: 'cancelled', note: reason || 'Cancelled by customer', at: new Date(), by: requester.id as unknown as Types.ObjectId } as any);

    // Give the stock back if it was reserved for this order
    if (!order.stockReversed) {
      await releaseStock(orderItemsForStock(order as OrderDoc));
      order.stockReversed = true;
    }
    await releaseCoupon(order.couponCode ?? null);

    if (order.paymentStatus === 'paid' && order.paymentMethod === 'stripe') {
      const result = await paymentProviders.stripe.refund({
        paymentIntentId: order.stripePaymentIntentId,
        amount: order.total,
      });
      if (result.ok) {
        order.paymentStatus = 'refunded';
        order.refundAmount = order.total;
        order.timeline.push({ status: 'refunded', note: 'Automatic refund issued', at: new Date() } as any);
      }
    }

    await order.save();
    const user = await User.findById(order.user);
    if (user) void mailService.sendOrderStatusUpdate(user.email, user.name, order.orderNumber, 'cancelled');
    return order;
  },

  /** Admin: change status, optionally set tracking info. */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    opts: { trackingNumber?: string; carrier?: string; note?: string; actorId?: string } = {},
  ) {
    const order = await Order.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');

    const prev = order.status;
    order.status = status;

    if (status === 'paid' && order.paymentStatus === 'unpaid') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
    if (opts.trackingNumber !== undefined) order.trackingNumber = opts.trackingNumber;
    if (opts.carrier !== undefined) order.carrier = opts.carrier;

    order.timeline.push({
      status,
      note: opts.note || `Status changed from ${prev} to ${status}`,
      at: new Date(),
      by: opts.actorId as unknown as Types.ObjectId,
    } as any);

    await order.save();
    const user = await User.findById(order.user);
    if (user) void mailService.sendOrderStatusUpdate(user.email, user.name, order.orderNumber, status);
    return order;
  },

  /** Admin: approve a refund (Stripe refund API for card payments, manual marker for COD). */
  async refund(orderId: string, actorId: string, amount?: number) {
    const order = await Order.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.paymentStatus !== 'paid') {
      throw ApiError.badRequest(`Cannot refund an order with payment status "${order.paymentStatus}"`);
    }

    const refundAmount = amount ? Math.min(amount, order.total) : order.total;
    let refundId = '';

    if (order.paymentMethod === 'stripe') {
      const result = await paymentProviders.stripe.refund({
        paymentIntentId: order.stripePaymentIntentId,
        amount: refundAmount,
      });
      if (!result.ok) throw ApiError.badRequest(result.error ?? 'Refund failed');
      refundId = result.refundId ?? '';
    } else {
      const result = await paymentProviders.cod.refund({});
      refundId = result.refundId ?? '';
    }

    order.paymentStatus = refundAmount >= order.total ? 'refunded' : 'partially_refunded';
    order.refundAmount = (order.refundAmount ?? 0) + refundAmount;
    if (order.status !== 'cancelled' && order.paymentStatus === 'refunded') order.status = 'refunded';
    order.timeline.push({
      status: order.status,
      note: `Refunded ${refundAmount.toFixed(2)} (${refundId})`,
      at: new Date(),
      by: actorId as unknown as Types.ObjectId,
    } as any);
    await order.save();
    return order;
  },

  /** Restore stock when a paid order transitions (used by webhook compensation). */
  async restoreStockFor(order: OrderDoc) {
    if (order.stockReversed) return;
    await releaseStock(orderItemsForStock(order));
    order.stockReversed = true;
    await order.save();
  },

  async reserveStockFor(order: OrderDoc): Promise<boolean> {
    const result = await reserveStock(orderItemsForStock(order));
    if (result.ok) {
      order.stockReversed = false;
      await order.save();
      await bumpSoldCount(orderItemsForStock(order), 1);
      return true;
    }
    logger.warn({ order: order.orderNumber, failedItem: result.failedItem }, 'Stock reservation failed');
    return false;
  },
};
