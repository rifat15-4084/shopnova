import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validate + parse request parts with a Zod schema.
 * Parsed values replace the originals (so defaults/transforms apply).
 */
export function validate(schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query ?? {});
        // Express 5 makes req.query a getter; fall back to a symbol-stashed copy.
        Object.assign(req.query as any, parsed);
        (req as any).validatedQuery = parsed;
      }
      if (schemas.params) {
        Object.assign(req.params as any, schemas.params.parse(req.params ?? {}));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
