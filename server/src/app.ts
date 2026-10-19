import type { Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';

import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { UPLOAD_DIR } from './services/upload.service.js';
import { Product } from './models/Product.js';
import routes from './routes/index.js';
import { openApiSpec, swaggerUi } from './docs/swagger.js';

/**
 * Turn a CLIENT_URL entry into a matcher: `*` matches any characters, so
 * `https://*.vercel.app` also allows preview deployments.
 */
function originPattern(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway/nginx) so req.ip and secure cookies work
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // SECURITY ─ helmet with a CSP that still allows Stripe.js + inline styles from Vite
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://js.stripe.com'],
              frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
              connectSrc: ["'self'", 'https://api.stripe.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // CORS — explicit allow-list from CLIENT_URL (comma-separated; `*` wildcards
  // allowed, e.g. https://shop-nava.vercel.app,https://*.vercel.app)
  const allowedOrigins = env.CLIENT_URL.split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const originMatchers = allowedOrigins.map(originPattern);
  if (isProd && allowedOrigins.every((o) => /localhost|127\.0\.0\.1/.test(o))) {
    logger.warn(
      'CLIENT_URL only contains localhost origins — CORS will block your deployed frontend. Set CLIENT_URL to your production origin(s).',
    );
  }
  app.use(
    cors({
      origin(origin, callback) {
        // non-browser clients (curl, server-to-server) and same-origin
        if (!origin || originMatchers.some((re) => re.test(origin))) {
          return callback(null, true);
        }
        logger.warn({ origin }, 'Blocked by CORS');
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );

  // Stripe webhooks need the RAW body — register before the JSON parser
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // NoSQL-injection hardening (only affects parsed bodies/queries/params)
  app.use(mongoSanitize({ allowDots: true, replaceWith: '_', onSanitize: ({ req }) => delete (req as any).body }));

  // Request logging (redacts auth headers & cookies)
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      serializers: {
        req(req) {
          return { method: req.method, url: req.url, remoteAddress: req.ip };
        },
      },
    }),
  );

  // Static uploads (local mode, when Cloudinary is not configured)
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: isProd ? '7d' : 0, fallthrough: true }));

  // API docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Health + readiness — DB state and catalogue size for quick production checks.
  // 200 when the database is reachable, 503 otherwise (usable as a PaaS probe).
  const health = async (_req: Request, res: Response) => {
    const state = mongoose.connection.readyState; // 0=disconnected 1=connected 2=connecting
    const db = state === 1 ? 'connected' : state === 2 ? 'connecting' : 'disconnected';
    let products: number | null = null;
    if (state === 1) {
      try {
        products = await Product.countDocuments().maxTimeMS(2000);
      } catch {
        products = null;
      }
    }
    res.status(db === 'connected' ? 200 : 503).json({
      status: db === 'connected' ? 'ok' : 'degraded',
      db,
      products,
      uptime: process.uptime(),
      ts: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  };
  app.get('/health', health);
  app.get('/api/health', health);

  // Rate limiting for the API only (health & docs stay open)
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/docs') || req.path.startsWith('/webhooks')) {
      return next();
    }
    return generalLimiter(req, res, next);
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
