import pino from 'pino';
import { env, isProd } from './env.js';
import { scrubMongoUri } from '../utils/sanitize.js';

/**
 * Redact MongoDB credentials from anything about to be logged (messages,
 * Error messages/stacks, plain-object string values). Arguments are only
 * replaced when they actually contain a URI with userinfo — otherwise the
 * original reference passes through untouched.
 */
function scrubArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') return scrubMongoUri(arg);
    if (arg instanceof Error) {
      const message = scrubMongoUri(arg.message);
      const stack = arg.stack ? scrubMongoUri(arg.stack) : undefined;
      if (message === arg.message && (stack ?? arg.stack) === arg.stack) return arg;
      const clone = new Error(message);
      clone.name = arg.name;
      if (stack) clone.stack = stack;
      return clone;
    }
    if (Array.isArray(arg)) {
      return arg.map((v) => (typeof v === 'string' ? scrubMongoUri(v) : v));
    }
    if (arg && typeof arg === 'object' && Object.getPrototypeOf(arg) === Object.prototype) {
      const out: Record<string, unknown> = { ...(arg as Record<string, unknown>) };
      let changed = false;
      for (const key of Object.keys(out)) {
        const v = out[key];
        if (typeof v === 'string') {
          const s = scrubMongoUri(v);
          if (s !== v) {
            out[key] = s;
            changed = true;
          }
        } else if (v instanceof Error) {
          const s = scrubArgs([v])[0];
          if (s !== v) {
            out[key] = s;
            changed = true;
          }
        }
      }
      return changed ? out : arg;
    }
    return arg;
  });
}

export const logger = pino({
  level: isProd ? env.LOG_LEVEL : env.LOG_LEVEL === 'info' ? 'info' : env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  hooks: {
    logMethod(args, method) {
      return (method as unknown as (...a: unknown[]) => unknown).apply(
        this,
        scrubArgs(args as unknown[]),
      );
    },
  },
});
