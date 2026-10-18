import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    API_URL: z.string().url().default('http://localhost:5000'),
    CLIENT_URL: z.string().default('http://localhost:5173'),

    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/shopnova'),

    JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-do-not-use-in-prod'),
    JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-do-not-use-in-prod'),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_EXPIRES: z.string().default('30d'),
    COOKIE_SECURE: z
      .string()
      .default('false')
      .transform((v) => v === 'true' || v === '1'),

    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    STRIPE_CURRENCY: z.string().default('usd'),

    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),

    MAIL_FROM: z.string().default('ShopNova <no-reply@shopnova.dev>'),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASS: z.string().optional().default(''),

    FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(100),
    FLAT_SHIPPING_RATE: z.coerce.number().min(0).default(7.5),
    TAX_RATE: z.coerce.number().min(0).max(1).default(0.05),
    DEFAULT_CURRENCY: z.string().default('usd'),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      const missing: string[] = [];
      if (env.JWT_ACCESS_SECRET.startsWith('dev-access')) missing.push('JWT_ACCESS_SECRET');
      if (env.JWT_REFRESH_SECRET.startsWith('dev-refresh')) missing.push('JWT_REFRESH_SECRET');
      if (missing.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Insecure default secrets in production: ${missing.join(', ')}`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`❌ Invalid environment variables:\n${details}\n\nSee server/.env.example`);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
