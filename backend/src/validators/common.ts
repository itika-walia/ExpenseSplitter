import { z } from 'zod';
import { isValidAmountString, MAX_PAISE, toPaise } from '../domain/money';

export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'id is required').max(64),
});

export const nameSchema = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(255);

/**
 * Accepts "1000", "333.33", 1000 or 333.33 and converts to integer paise.
 * Rejects more than 2 decimals, non-positive values and anything that
 * would overflow numeric(12,2).
 */
export const positiveAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(isValidAmountString, 'Amount must be a number with at most 2 decimal places')
  .transform((value) => toPaise(value))
  .refine((paise) => paise > 0, 'Amount must be greater than 0')
  .refine((paise) => paise <= MAX_PAISE, 'Amount is too large');

/** YYYY-MM-DD or full ISO timestamp; stored as a Date. */
export const dateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date')
  .transform((value) => new Date(value));
