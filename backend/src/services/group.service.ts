import { prisma } from '../lib/prisma';
import type { AuthUser } from '../middleware/auth';
import { fromPaise, sumPaise, toPaise } from '../domain/money';
import { HttpError } from '../utils/httpError';
import { memberOrder } from './ordering';
import type { CreateGroupInput, MemberInput } from '../validators/group.validators';
import {
  expenseInclude,
  serializeExpense,
  serializeMember,
  serializeSettlement,
  settlementInclude,
} from './serializers';

/** Groups the user belongs to, newest first, with summary counts. */
export async function listGroups(user: AuthUser) {
  const groups = await prisma.group.findMany({
    where: { members: { some: { email: user.email } } },
    orderBy: { createdAt: 'desc' },
    include: {
      members: { orderBy: memberOrder },
      expenses: { select: { amount: true } },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    memberCount: group.members.length,
    expenseCount: group.expenses.length,
    totalSpent: fromPaise(sumPaise(group.expenses.map((expense) => toPaise(expense.amount)))),
    members: group.members.map(serializeMember),
  }));
}

/**
 * Creates a group. The creator is always added as the first member (so they
 * keep access); extra members are de-duplicated by email.
 */
export async function createGroup(user: AuthUser, input: CreateGroupInput) {
  const seen = new Set<string>([user.email]);
  const members: MemberInput[] = [{ name: user.name, email: user.email }];
  for (const member of input.members) {
    if (!seen.has(member.email)) {
      seen.add(member.email);
      members.push(member);
    }
  }

  const group = await prisma.group.create({
    data: {
      name: input.name,
      createdById: user.id,
      members: { create: members },
    },
  });
  return getGroupDetail(group.id);
}

/** Group with members, expenses (newest first) and settlement history. */
export async function getGroupDetail(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: memberOrder },
      expenses: { include: expenseInclude, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] },
      settlements: { include: settlementInclude, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] },
    },
  });
  if (!group) {
    throw HttpError.notFound('Group not found');
  }

  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    createdById: group.createdById,
    members: group.members.map(serializeMember),
    expenses: group.expenses.map(serializeExpense),
    settlements: group.settlements.map(serializeSettlement),
  };
}

export async function addMember(groupId: string, input: MemberInput) {
  const existing = await prisma.member.findUnique({
    where: { groupId_email: { groupId, email: input.email } },
  });
  if (existing) {
    throw HttpError.conflict('A member with this email is already in the group');
  }
  const member = await prisma.member.create({ data: { ...input, groupId } });
  return serializeMember(member);
}
