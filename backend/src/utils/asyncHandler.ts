import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Forwards rejected promises from async route handlers to the error middleware. */
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
