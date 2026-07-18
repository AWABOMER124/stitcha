import { z } from 'zod';

export const updateDistributorSettingsSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(100),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export type UpdateDistributorSettingsInput = z.infer<typeof updateDistributorSettingsSchema>;
