import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

/** Bangladesh-friendly phone: +8801XXXXXXXXX or 01XXXXXXXXX */
export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?880|0)1[3-9]\d{8}$/, 'Enter a valid Bangladeshi phone number (e.g. +8801712345678)');

export const genericPhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number');

export const BD_DIVISIONS = [
  'Barishal',
  'Chattogram',
  'Dhaka',
  'Khulna',
  'Mymensingh',
  'Rajshahi',
  'Rangpur',
  'Sylhet',
] as const;

export const addressInputSchema = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2).max(80),
  phone: bdPhoneSchema,
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80), // district
  region: z.enum(BD_DIVISIONS).optional(), // division
  upazila: z.string().trim().max(80).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Postal code must be 4 digits')
    .optional()
    .or(z.literal('')),
  country: z.string().trim().max(60).optional(),
  isDefault: z.boolean().optional(),
});

export const emailSchema = z.string().trim().toLowerCase().email().max(120);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const sortSchema = z
  .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating'])
  .optional();
