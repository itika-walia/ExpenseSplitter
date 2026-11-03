import type { AuthenticatedRequest } from './auth';
import { assertGroupAccess } from '../services/access.service';
import { asyncHandler } from '../utils/asyncHandler';

/** Ensures the authenticated user is a member of the group in req.params.id. */
export const requireGroupMember = asyncHandler<AuthenticatedRequest>(async (req, _res, next) => {
  await assertGroupAccess(req.params.id, req.user);
  next();
});
