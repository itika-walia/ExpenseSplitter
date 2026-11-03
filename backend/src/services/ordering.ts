import type { Prisma } from '@prisma/client';

/**
 * Members created in the same transaction can share a createdAt timestamp,
 * so id (a time-ordered cuid) is used as a tie-breaker for stable ordering.
 */
export const memberOrder: Prisma.MemberOrderByWithRelationInput[] = [{ createdAt: 'asc' }, { id: 'asc' }];
