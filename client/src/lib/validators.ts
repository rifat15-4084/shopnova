import { z } from 'zod';

/** Bangladesh phone: +8801XXXXXXXXX, 8801XXXXXXXXX or 01XXXXXXXXX. */
export const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72)
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

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

/**
 * Mirrors the server `addressInputSchema` exactly so the server never rejects
 * a value the client already accepted.
 */
export const addressSchema = z.object({
  label: z.string().trim().max(30).optional().or(z.literal('')),
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, 'Enter a valid BD mobile number, e.g. 01712345678'),
  line1: z.string().trim().min(3, 'Street address is required').max(160),
  line2: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City / district is required').max(80),
  region: z.enum(BD_DIVISIONS, { errorMap: () => ({ message: 'Select a division' }) }),
  upazila: z.string().trim().max(80).optional().or(z.literal('')),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, 'Postal code must be 4 digits, e.g. 1207')
    .optional()
    .or(z.literal('')),
  country: z.string().trim().max(60).optional(),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  paymentMethod: z.enum(['stripe', 'cod', 'bkash']),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(3, 'Tell us a little more').max(2000),
});
