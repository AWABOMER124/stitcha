import { z } from 'zod';

export const updateMerchantSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  currency: z.string().max(5).optional(),
  timezone: z.string().optional(),
});

export const updateStorefrontSettingsSchema = z.object({
  welcomeText: z.string().optional(),
  bannerImage: z.string().optional(),
  isOpen: z.boolean().optional(),
  minimumOrderAmount: z.number().min(0).optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  workingHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() })).optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    whatsapp: z.string().optional(),
  }).optional(),
});

export type UpdateMerchantSettingsInput = z.infer<typeof updateMerchantSettingsSchema>;
export type UpdateStorefrontSettingsInput = z.infer<typeof updateStorefrontSettingsSchema>;
