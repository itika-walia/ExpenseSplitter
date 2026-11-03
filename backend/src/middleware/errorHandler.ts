import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { SplitError } from '../domain/split';
import { HttpError } from '../utils/httpError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (err instanceof SplitError) {
    res.status(400).json({ error: { message: err.message } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'A record with these details already exists' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Resource not found' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: { message: 'Referenced record does not exist' } });
      return;
    }
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { message: 'Malformed JSON body' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
