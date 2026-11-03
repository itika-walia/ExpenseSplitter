import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'params' | 'query';

/**
 * Parses req[source] with the schema and replaces it with the parsed value,
 * so handlers receive trimmed/coerced data. Zod errors reach errorHandler.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    req[source] = result.data;
    next();
  };
}
