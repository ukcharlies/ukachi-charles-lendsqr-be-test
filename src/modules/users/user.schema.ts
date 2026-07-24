import { z } from 'zod';
export const createUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?234|0)[789][01]\d{8}$/, 'Phone must be a valid Nigerian mobile number'),
    bvn: z
      .string()
      .regex(/^\d{11}$/)
      .optional(),
  })
  .strict();
