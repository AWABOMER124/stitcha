import { z } from 'zod';

export const requestOtpSchema = z.object({
  userId: z.string().cuid(),
});

export const verifyOtpSchema = z.object({
  userId: z.string().cuid(),
  code: z.string().length(6, 'الكود مكوّن من 6 أرقام'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
