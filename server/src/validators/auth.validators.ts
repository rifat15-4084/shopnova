import { z } from 'zod';
import { emailSchema, passwordSchema, addressInputSchema } from './common.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: emailSchema.optional(),
});

export const addressSchemaInput = addressInputSchema;
export { addressInputSchema };
export const updateAddressSchema = addressInputSchema.partial().extend({ id: z.string().optional() });
export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product id'),
        variantId: z.string().nullish(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .max(50)
    .default([]),
});
