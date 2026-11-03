import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = { sub: user.id, email: user.email, name: user.name };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

/** Requires a valid "Authorization: Bearer <jwt>" header and sets req.user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(HttpError.unauthorized());
    return;
  }
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET) as TokenPayload;
    (req as AuthenticatedRequest).user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    next(HttpError.unauthorized('Invalid or expired token'));
  }
};
