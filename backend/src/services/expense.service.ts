import { SplitType, type ExpenseCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthUser } from '../middleware/auth';
import { fromPaise } from '../domain/money';
import { splitByPercentage, splitEqually, splitExactly, type ComputedShare } from '../domain/split';
import { HttpError } from '../utils/httpError';
import type { CreateExpenseInput } from '../validators/group.validators';
import { assertGroupAccess } from './access.service';
import { expenseInclude, isoDate, money, serializeExpense } from './serializers';

export interface ExpenseRecord {
  groupId: string;
  description: string;
  amountPaise: number;
  date: Date;
  paidById: string;
  category: ExpenseCategory;
  splitType: SplitType;
  shares: ComputedShare[];
}

function computeShares(input: CreateExpenseInput): ComputedShare[] {
  switch (input.splitType) {
    case SplitType.EXACT:
      return splitExactly(input.amount, input.shares);
    case SplitType.PERCENTAGE:
      return splitByPercentage(input.amount, input.shares);
    default:
      return splitEqually(
        input.amount,
        input.shares.map((share) => share.memberId),
      );
  }
}

/**
 * Writes the expense and all of its shares in a single database transaction:
 * if any share fails to insert, the expense is rolled back too.
 */
export async function persistExpense(record: ExpenseRecord) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        groupId: record.groupId,
        description: record.description,
        amount: fromPaise(record.amountPaise),
        date: record.date,
        paidById: record.paidById,
        category: record.category,
        splitType: record.splitType,
      },
    });
    await tx.expenseShare.createMany({
      data: record.shares.map((share) => ({
        expenseId: expense.id,
        memberId: share.memberId,
        shareAmount: fromPaise(share.sharePaise),
      })),
    });
    return tx.expense.findUniqueOrThrow({ where: { id: expense.id }, include: expenseInclude });
  });
}

export async function createExpense(groupId: string, input: CreateExpenseInput) {
  const members = await prisma.member.findMany({ where: { groupId }, select: { id: true } });
  const memberIds = new Set(members.map((member) => member.id));

  if (!memberIds.has(input.paidById)) {
    throw HttpError.badRequest('The payer must be a member of this group');
  }
  const outsider = input.shares.find((share) => !memberIds.has(share.memberId));
  if (outsider) {
    throw HttpError.badRequest('Every member sharing the expense must belong to this group');
  }

  const shares = computeShares(input);
  const expense = await persistExpense({
    groupId,
    description: input.description,
    amountPaise: input.amount,
    date: input.date,
    paidById: input.paidById,
    category: input.category,
    splitType: input.splitType,
    shares,
  });
  return serializeExpense(expense);
}

/** Deletes an expense and its shares together, after checking group access. */
export async function deleteExpense(expenseId: string, user: AuthUser) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId }, select: { groupId: true } });
  if (!expense) {
    throw HttpError.notFound('Expense not found');
  }
  await assertGroupAccess(expense.groupId, user);

  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { expenseId } }),
    prisma.expense.delete({ where: { id: expenseId } }),
  ]);
}

function csvCell(value: string): string {
  // Quote every cell; neutralise leading formula characters for spreadsheet safety
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV export of a group's expenses, one row per expense. */
export async function exportExpensesCsv(groupId: string) {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: expenseInclude,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const header = ['Date', 'Description', 'Category', 'Amount (INR)', 'Paid by', 'Split type', 'Shares'];
  const rows = expenses.map((expense) => [
    isoDate(expense.date),
    expense.description,
    expense.category,
    money(expense.amount),
    expense.paidBy.name,
    expense.splitType,
    expense.shares.map((share) => `${share.member.name}: ${money(share.shareAmount)}`).join('; '),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
