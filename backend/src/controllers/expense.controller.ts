import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import * as expenseService from '../services/expense.service';

export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  await expenseService.deleteExpense(req.params.id, req.user);
  res.status(204).end();
}
