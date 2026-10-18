import { z } from 'zod';
import { addressInputSchema, objectIdSchema } from './common.js';

export const cartItemSchema = z.object({
  productId: objectIdSchema,
  variantId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullish(),
  qty: z.number().int().min(1).max(999),
});

/** Same shape, but qty 0 means "remove". */
export const cartItemUpdateSchema = cartItemSchema.extend({
  qty: z.number().int().min(0).max(999),
});

export const couponApplySchema = z.object({
  code: z.string().trim().max(30).nullish(),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(3).max(30),
});

export const checkoutSessionSchema = z.object({
  shippingAddress: addressInputSchema,
  couponCode: z.string().trim().max(30).nullish(),
});

export const placeOrderSchema = z.object({
  paymentMethod: z.enum(['cod', 'bkash']),
  shippingAddress: addressInputSchema,
  couponCode: z.string().trim().max(30).nullish(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().trim().max(80).optional(),
  carrier: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export const refundSchema = z.object({
  amount: z.number().min(0).optional(),
  reason: z.string().trim().max(300).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z
    .enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .optional(),
});

export const adminOrderListQuerySchema = orderListQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const couponCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Coupon code may only contain letters, numbers, - and _')
    .transform((s) => s.toUpperCase()),
  description: z.string().trim().max(300).default(''),
  type: z.enum(['percent', 'fixed']),
  value: z.number().min(0),
  maxDiscount: z.number().min(0).default(0),
  minOrder: z.number().min(0).default(0),
  expiryDate: z.coerce.date(),
  usageLimit: z.number().int().min(0).default(0),
  perUserLimit: z.number().int().min(1).default(1),
  applicableProductIds: z.array(objectIdSchema).default([]),
  isActive: z.boolean().default(true),
});

export const couponUpdateSchema = couponCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  image: z.string().max(500).default(''),
  description: z.string().trim().max(500).default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const customerUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['customer', 'admin']).optional(),
  name: z.string().trim().min(2).max(80).optional(),
});

export const reviewModerationSchema = z.object({
  isApproved: z.boolean(),
});

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
