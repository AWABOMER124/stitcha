import { z } from 'zod';

export const createDeliveryCompanySchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(100),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateDeliveryCompanySchema = createDeliveryCompanySchema.partial();

export type CreateDeliveryCompanyInput = z.infer<typeof createDeliveryCompanySchema>;
export type UpdateDeliveryCompanyInput = z.infer<typeof updateDeliveryCompanySchema>;
