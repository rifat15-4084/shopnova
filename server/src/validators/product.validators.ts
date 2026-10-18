import { z } from 'zod';
import { paginationQuerySchema, sortSchema, objectIdSchema } from './common.js';

export const productListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .optional(),
  featured: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .optional(),
  sort: sortSchema,
});

export const variantSchema = z.object({
  name: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
  priceDelta: z.number().min(-100000).max(100000).default(0),
  stock: z.number().int().min(0).default(0),
  sku: z.string().trim().max(60).optional(),
  image: z.string().max(500).optional(),
});

export const productCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().min(10).max(8000),
  brand: z.string().trim().max(80).default('ShopNova'),
  sku: z.string().trim().max(60).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).default(0),
  images: z.array(z.string().max(500)).max(10).default([]),
  category: objectIdSchema,
  stock: z.number().int().min(0).default(0),
  variants: z.array(variantSchema).max(50).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  weightKg: z.number().min(0).max(500).default(0.5),
});

export const productUpdateSchema = productCreateSchema.partial();

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z
    .string()
    .trim()
    .min(3, 'Review is too short')
    .max(2000)
    .transform((s) =>
      // Basic XSS hardening: strip angle brackets so content can never break out of text nodes
      s.replace(/[<>]/g, ''),
    ),
});

export const reviewListQuerySchema = paginationQuerySchema;
