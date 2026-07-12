import { z } from 'zod';

export const saveWhatsAppConfigSchema = z.object({
  phoneNumberId: z.string().min(1, 'معرّف الرقم مطلوب').max(50),
  wabaId: z.string().max(50).optional(),
  displayPhone: z.string().max(30).optional(),
  // Optional on update — blank means "keep the existing token". Required on
  // first-time connect, enforced in the service since that depends on
  // whether a config already exists for this merchant.
  accessToken: z.string().min(10, 'رمز الوصول غير صالح').optional().or(z.literal('')),
});

export type SaveWhatsAppConfigInput = z.infer<typeof saveWhatsAppConfigSchema>;
