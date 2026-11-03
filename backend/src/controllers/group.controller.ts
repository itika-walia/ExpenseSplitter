import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import * as balanceService from '../services/balance.service';
import * as expenseService from '../services/expense.service';
import * as groupService from '../services/group.service';
import * as settlementService from '../services/settlement.service';

export async function listGroups(req: AuthenticatedRequest, res: Response) {
  res.json({ groups: await groupService.listGroups(req.user) });
}

export async function createGroup(req: AuthenticatedRequest, res: Response) {
  res.status(201).json({ group: await groupService.createGroup(req.user, req.body) });
}

export async function getGroup(req: AuthenticatedRequest, res: Response) {
  res.json({ group: await groupService.getGroupDetail(req.params.id) });
}

export async function addMember(req: AuthenticatedRequest, res: Response) {
  res.status(201).json({ member: await groupService.addMember(req.params.id, req.body) });
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  res.status(201).json({ expense: await expenseService.createExpense(req.params.id, req.body) });
}

export async function getBalances(req: AuthenticatedRequest, res: Response) {
  res.json(await balanceService.getGroupBalances(req.params.id));
}

export async function createSettlement(req: AuthenticatedRequest, res: Response) {
  res.status(201).json({ settlement: await settlementService.createSettlement(req.params.id, req.body) });
}

export async function exportExpenses(req: AuthenticatedRequest, res: Response) {
  const csv = await expenseService.exportExpensesCsv(req.params.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="group-${req.params.id}-expenses.csv"`);
  res.send(csv);
}
