import type { Expense, ExpenseShare, Member, Prisma, Settlement } from '@prisma/client';
import { fromPaise, toPaise } from '../domain/money';

/** Prisma Decimal -> canonical "1234.50" string (Decimal.toJSON drops trailing zeros). */
export function money(value: Prisma.Decimal): string {
  return fromPaise(toPaise(value));
}

/** Date column (@db.Date) -> "YYYY-MM-DD". */
export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializeMember(member: Member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    groupId: member.groupId,
    createdAt: member.createdAt.toISOString(),
  };
}

type ExpenseWithRelations = Expense & {
  paidBy: Member;
  shares: (ExpenseShare & { member: Member })[];
};

export function serializeExpense(expense: ExpenseWithRelations) {
  return {
    id: expense.id,
    description: expense.description,
    amount: money(expense.amount),
    date: isoDate(expense.date),
    category: expense.category,
    splitType: expense.splitType,
    groupId: expense.groupId,
    paidById: expense.paidById,
    paidBy: { id: expense.paidBy.id, name: expense.paidBy.name },
    createdAt: expense.createdAt.toISOString(),
    shares: expense.shares.map((share) => ({
      id: share.id,
      memberId: share.memberId,
      memberName: share.member.name,
      shareAmount: money(share.shareAmount),
    })),
  };
}

type SettlementWithRelations = Settlement & { fromMember: Member; toMember: Member };

export function serializeSettlement(settlement: SettlementWithRelations) {
  return {
    id: settlement.id,
    groupId: settlement.groupId,
    fromMemberId: settlement.fromMemberId,
    toMemberId: settlement.toMemberId,
    fromMember: { id: settlement.fromMember.id, name: settlement.fromMember.name },
    toMember: { id: settlement.toMember.id, name: settlement.toMember.name },
    amount: money(settlement.amount),
    date: settlement.date.toISOString(),
    note: settlement.note,
    createdAt: settlement.createdAt.toISOString(),
  };
}

export const expenseInclude = {
  paidBy: true,
  shares: { include: { member: true }, orderBy: [{ member: { createdAt: 'asc' } }, { member: { id: 'asc' } }] },
} satisfies Prisma.ExpenseInclude;

export const settlementInclude = {
  fromMember: true,
  toMember: true,
} satisfies Prisma.SettlementInclude;
