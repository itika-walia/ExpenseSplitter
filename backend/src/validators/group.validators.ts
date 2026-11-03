import { ExpenseCategory, SplitType } from '@prisma/client';
import { z } from 'zod';
import { isValidAmountString, toPaise } from '../domain/money';
import { dateSchema, emailSchema, nameSchema, positiveAmountSchema } from './common';

export const memberInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100, 'Group name is too long'),
  members: z.array(memberInputSchema).max(50).default([]),
});

/** Non-negative 2-decimal value converted to an integer x100 (paise or basis points). */
const hundredthsSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(isValidAmountString, 'Must be a number with at most 2 decimal places')
  .transform((value) => toPaise(value))
  .refine((value) => value >= 0, 'Must not be negative');

export const createExpenseSchema = z
  .object({
    description: z.string().trim().min(1, 'Description is required').max(200, 'Description is too long'),
    amount: positiveAmountSchema,
    paidById: z.string().trim().min(1, 'Select who paid'),
    date: dateSchema,
    category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
    splitType: z.nativeEnum(SplitType).default(SplitType.EQUAL),
    /** EQUAL: just memberIds. EXACT: value is the amount. PERCENTAGE: value is the percent. */
    shares: z
      .array(
        z.object({
          memberId: z.string().trim().min(1),
          value: hundredthsSchema.optional(),
        }),
      )
      .min(1, 'Select at least one member to share the expense'),
  })
  .superRefine((data, ctx) => {
    if (data.splitType !== SplitType.EQUAL) {
      data.shares.forEach((share, index) => {
        if (share.value === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['shares', index, 'value'],
            message: `A value is required for every member in a ${data.splitType.toLowerCase()} split`,
          });
        }
      });
    }
  });

export const createSettlementSchema = z
  .object({
    fromMemberId: z.string().trim().min(1, 'Select who paid'),
    toMemberId: z.string().trim().min(1, 'Select who received the payment'),
    amount: positiveAmountSchema,
    date: dateSchema.optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.fromMemberId !== data.toMemberId, {
    message: 'Payer and receiver must be different members',
    path: ['toMemberId'],
  });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type MemberInput = z.infer<typeof memberInputSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
