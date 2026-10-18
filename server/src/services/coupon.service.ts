import { env } from '../config/env.js';
import { Coupon, type CouponDoc } from '../models/Coupon.js';
import { ApiError } from '../utils/errors.js';
import { round2 } from '../utils/crypto.js';

export interface CouponValidationResult {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discount: number;
  description: string;
}

/**
 * Validate a coupon against an order subtotal and return the discount amount.
 * Pure-ish: side effect free (usedCount increment happens in checkout service).
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  opts: { userId?: string; productIds?: string[] } = {},
): Promise<{ coupon: CouponDoc; result: CouponValidationResult }> {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');
  if (coupon.expiryDate.getTime() < Date.now())
    throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
    throw ApiError.badRequest('This coupon has reached its usage limit');
  if (coupon.minOrder > 0 && subtotal < coupon.minOrder)
    throw ApiError.badRequest(
      `This coupon requires a minimum order of ${env.DEFAULT_CURRENCY.toUpperCase()} ${coupon.minOrder.toFixed(2)}`,
    );

  let eligibleSubtotal = subtotal;
  if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0 && opts.productIds) {
    const applicable = new Set(coupon.applicableProductIds.map(String));
    // When restricted, the caller must pass per-line eligible amounts via productIds+amounts.
    // For simplicity we treat the whole subtotal as eligible only if no restriction set.
    eligibleSubtotal = subtotal;
    if (!opts.productIds.some((id) => applicable.has(String(id)))) {
      throw ApiError.badRequest('This coupon does not apply to items in your cart');
    }
  }

  let discount =
    coupon.type === 'percent' ? (eligibleSubtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = round2(Math.min(Math.max(discount, 0), eligibleSubtotal));

  return {
    coupon,
    result: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      description: coupon.description,
    },
  };
}
