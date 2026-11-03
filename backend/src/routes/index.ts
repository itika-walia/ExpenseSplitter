import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as expenseController from '../controllers/expense.controller';
import * as groupController from '../controllers/group.controller';
import { requireAuth } from '../middleware/auth';
import { requireGroupMember } from '../middleware/groupAccess';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, registerSchema } from '../validators/auth.validators';
import { idParamSchema } from '../validators/common';
import {
  createExpenseSchema,
  createGroupSchema,
  createSettlementSchema,
  memberInputSchema,
} from '../validators/group.validators';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth
apiRouter.post('/auth/register', validate(registerSchema), asyncHandler(authController.register));
apiRouter.post('/auth/login', validate(loginSchema), asyncHandler(authController.login));
apiRouter.get('/auth/me', requireAuth, asyncHandler(authController.me));

// Groups - every route below requires a signed-in user
const groupRouter = Router();
groupRouter.use(requireAuth);
groupRouter.get('/', asyncHandler(groupController.listGroups));
groupRouter.post('/', validate(createGroupSchema), asyncHandler(groupController.createGroup));

// Routes scoped to one group also require membership of that group
const memberOnly = [validate(idParamSchema, 'params'), requireGroupMember];
groupRouter.get('/:id', memberOnly, asyncHandler(groupController.getGroup));
groupRouter.post('/:id/members', memberOnly, validate(memberInputSchema), asyncHandler(groupController.addMember));
groupRouter.post(
  '/:id/expenses',
  memberOnly,
  validate(createExpenseSchema),
  asyncHandler(groupController.createExpense),
);
groupRouter.get('/:id/expenses/export', memberOnly, asyncHandler(groupController.exportExpenses));
groupRouter.get('/:id/balances', memberOnly, asyncHandler(groupController.getBalances));
groupRouter.post(
  '/:id/settlements',
  memberOnly,
  validate(createSettlementSchema),
  asyncHandler(groupController.createSettlement),
);
apiRouter.use('/groups', groupRouter);

// Expenses
apiRouter.delete(
  '/expenses/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  asyncHandler(expenseController.deleteExpense),
);
