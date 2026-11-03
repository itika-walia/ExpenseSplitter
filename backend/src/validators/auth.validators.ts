import { z } from 'zod';
import { emailSchema, nameSchema } from './common';

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
