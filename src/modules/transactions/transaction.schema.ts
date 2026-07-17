import { z } from 'zod';
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const amount = z.string();
const description = z.string().trim().max(255).optional();
export const fundingSchema = z
  .object({ amount, sourceReference: z.string().trim().min(1).max(100), description })
  .strict();
export const transferSchema = z
  .object({ recipientEmail: z.string().email().max(254), amount, description })
  .strict();
export const withdrawalSchema = z
  .object({
    amount,
    bankCode: z.string().regex(/^\d{3}$/),
    accountNumber: z.string().regex(/^\d{10}$/),
    description,
  })
  .strict();
export const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['FUNDING', 'TRANSFER', 'WITHDRAWAL']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
