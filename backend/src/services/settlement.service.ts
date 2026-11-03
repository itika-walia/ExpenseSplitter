import { prisma } from '../lib/prisma';
import { fromPaise } from '../domain/money';
import { HttpError } from '../utils/httpError';
import type { CreateSettlementInput } from '../validators/group.validators';
import { serializeSettlement, settlementInclude } from './serializers';

/** Records a payment from one member to another within the group. */
export async function createSettlement(groupId: string, input: CreateSettlementInput) {
  const count = await prisma.member.count({
    where: { groupId, id: { in: [input.fromMemberId, input.toMemberId] } },
  });
  if (count !== 2) {
    throw HttpError.badRequest('Both payer and receiver must be members of this group');
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amount: fromPaise(input.amount),
      date: input.date ?? new Date(),
      note: input.note || null,
    },
    include: settlementInclude,
  });
  return serializeSettlement(settlement);
}
