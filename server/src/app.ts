import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import pinoHttp from 'pino-http';

import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { UPLOAD_DIR } from './services/upload.service.js';
import routes from './routes/index.js';
import { openApiSpec, swaggerUi } from './docs/swagger.js';

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

  // CORS — explicit allow-list from env
  const allowedOrigins = env.CLIENT_URL.split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        // non-browser clients (curl, server-to-server) and same-origin
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
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

  // Health + readiness
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
  });

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
