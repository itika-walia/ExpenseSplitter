import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response) {
  res.status(201).json(await authService.register(req.body));
}

export async function login(req: Request, res: Response) {
  res.json(await authService.login(req.body));
}

export async function me(req: AuthenticatedRequest, res: Response) {
  res.json({ user: await authService.getCurrentUser(req.user.id) });
}
