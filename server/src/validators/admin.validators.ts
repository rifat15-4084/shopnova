import { z } from 'zod';
import { paginationQuerySchema } from './common.js';
import {
  orderListQuerySchema,
  couponCreateSchema,
  couponUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
} from './commerce.validators.js';

export { orderListQuerySchema };

export const adminOrderListQuerySchema = orderListQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const adminCustomerListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'admin']).optional(),
});

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export {
  couponCreateSchema,
  couponUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
};

export const refundSchema = z.object({
  amount: z.number().min(0).optional(),
  reason: z.string().trim().max(300).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().trim().max(80).optional(),
  carrier: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export const customerUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['customer', 'admin']).optional(),
  name: z.string().trim().min(2).max(80).optional(),
});

export const reviewModerationSchema = z.object({
  isApproved: z.boolean(),
});

export const auditListQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
});

export const productAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating']).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
});

export const reviewListAdminQuerySchema = paginationQuerySchema.extend({
  pending: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .optional(),
});
