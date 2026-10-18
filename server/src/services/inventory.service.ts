import { Order, type OrderDoc } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { logger } from '../config/logger.js';

/**
 * Atomically reserve stock for order items.
 * Each line uses a conditional $inc guarded by `stock >= qty` so two concurrent
 * checkouts can never oversell. If any line fails, already-decremented lines are
 * rolled back (compensating transaction — works on standalone MongoDB too).
 */
export async function reserveStock(
  items: Array<{ product: string; variantId: string | null; qty: number }>,
): Promise<{ ok: boolean; failedItem?: string }> {
  const applied: Array<{ product: string; variantId: string | null; qty: number }> = [];

  for (const item of items) {
    const filter = item.variantId
      ? { _id: item.product, 'variants._id': item.variantId, 'variants.stock': { $gte: item.qty } }
      : { _id: item.product, stock: { $gte: item.qty } };
    const update = item.variantId
      ? { $inc: { 'variants.$.stock': -item.qty } }
      : { $inc: { stock: -item.qty } };

    const res = await Product.updateOne(filter, update as any);
    if (res.modifiedCount === 0) {
      // compensate
      await releaseStock(applied);
      const product = await Product.findById(item.product).select('title');
      return { ok: false, failedItem: product?.title ?? 'an item' };
    }
    applied.push(item);
  }
  return { ok: true };
}

/** Return previously reserved stock (used on cancel/refund and rollback). */
export async function releaseStock(
  items: Array<{ product: string; variantId: string | null; qty: number }>,
): Promise<void> {
  for (const item of items) {
    const filter = item.variantId
      ? { _id: item.product, 'variants._id': item.variantId }
      : { _id: item.product };
    const update = item.variantId
      ? { $inc: { 'variants.$.stock': item.qty } }
      : { $inc: { stock: item.qty } };
    try {
      await Product.updateOne(filter, update as any);
    } catch (err) {
      logger.error({ err, item }, 'Failed to release stock');
    }
  }
}

/** Increment sold counters (best-effort). */
export async function bumpSoldCount(
  items: Array<{ product: string; variantId: string | null; qty: number }>,
  factor: 1 | -1,
): Promise<void> {
  for (const item of items) {
    try {
      await Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.qty * factor } });
    } catch (err) {
      logger.error({ err }, 'Failed to update soldCount');
    }
  }
}

export async function consumeCoupon(code: string | null): Promise<void> {
  if (!code) return;
  await Coupon.updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } });
}

export async function releaseCoupon(code: string | null): Promise<void> {
  if (!code) return;
  await Coupon.updateOne({ code: code.toUpperCase(), usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

export function orderItemsForStock(order: OrderDoc) {
  return (order.items as any[]).map((i) => ({
    product: String(i.product),
    variantId: i.variantId ?? null,
    qty: i.qty,
  }));
}
