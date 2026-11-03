import { prisma } from '../lib/prisma';
import type { AuthUser } from '../middleware/auth';
import { HttpError } from '../utils/httpError';

/**
 * Authorization rule: a user may read and modify a group when their account
 * email matches one of the group's members. Returns the matching member.
 */
export async function assertGroupAccess(groupId: string, user: AuthUser) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, members: { where: { email: user.email }, select: { id: true } } },
  });
  if (!group) {
    throw HttpError.notFound('Group not found');
  }
  if (group.members.length === 0) {
    throw HttpError.forbidden('You are not a member of this group');
  }
  return group.members[0];
}
