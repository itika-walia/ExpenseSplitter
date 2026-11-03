import { prisma } from '../lib/prisma';
import { computeNetBalances, suggestSettlements } from '../domain/balances';
import { fromPaise, sumPaise, toPaise } from '../domain/money';
import { HttpError } from '../utils/httpError';
import { memberOrder } from './ordering';

/**
 * Net balance per member, settle-up suggestions and per-category totals.
 * Balances are recomputed from the ledger on every call, so a recorded
 * settlement is reflected immediately.
 */
export async function getGroupBalances(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: memberOrder },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) {
    throw HttpError.notFound('Group not found');
  }

  const expenses = group.expenses.map((expense) => ({
    paidById: expense.paidById,
    category: expense.category,
    amountPaise: toPaise(expense.amount),
    shares: expense.shares.map((share) => ({ memberId: share.memberId, sharePaise: toPaise(share.shareAmount) })),
  }));
  const settlements = group.settlements.map((settlement) => ({
    fromMemberId: settlement.fromMemberId,
    toMemberId: settlement.toMemberId,
    amountPaise: toPaise(settlement.amount),
  }));

  const memberIds = group.members.map((member) => member.id);
  const net = computeNetBalances(memberIds, expenses, settlements);
  const names = new Map(group.members.map((member) => [member.id, member.name]));

  const totalFor = (memberId: string, pick: (memberId: string) => number[]) => fromPaise(sumPaise(pick(memberId)));

  const balances = group.members.map((member) => ({
    memberId: member.id,
    name: member.name,
    email: member.email,
    totalPaid: totalFor(member.id, (id) =>
      expenses.filter((expense) => expense.paidById === id).map((expense) => expense.amountPaise),
    ),
    totalShare: totalFor(member.id, (id) =>
      expenses.flatMap((expense) => expense.shares.filter((share) => share.memberId === id).map((s) => s.sharePaise)),
    ),
    settlementsPaid: totalFor(member.id, (id) =>
      settlements.filter((s) => s.fromMemberId === id).map((s) => s.amountPaise),
    ),
    settlementsReceived: totalFor(member.id, (id) =>
      settlements.filter((s) => s.toMemberId === id).map((s) => s.amountPaise),
    ),
    net: fromPaise(net.get(member.id) ?? 0),
  }));

  const suggestions = suggestSettlements(net).map((transfer) => ({
    fromMemberId: transfer.fromMemberId,
    fromName: names.get(transfer.fromMemberId) ?? '',
    toMemberId: transfer.toMemberId,
    toName: names.get(transfer.toMemberId) ?? '',
    amount: fromPaise(transfer.amountPaise),
  }));

  const categoryTotals = new Map<string, number>();
  for (const expense of expenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amountPaise);
  }

  return {
    groupId: group.id,
    totalSpent: fromPaise(sumPaise(expenses.map((expense) => expense.amountPaise))),
    balances,
    suggestions,
    categoryTotals: [...categoryTotals]
      .sort(([, a], [, b]) => b - a)
      .map(([category, paise]) => ({ category, amount: fromPaise(paise) })),
  };
}
