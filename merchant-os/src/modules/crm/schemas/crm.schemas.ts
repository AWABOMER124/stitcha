import { z } from 'zod';

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  segment: z.enum(['NEW', 'REGULAR', 'VIP', 'INACTIVE', 'BLOCKED']).optional(),
  isBlocked: z.boolean().optional(),
});

export const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY']),
  value: z.number().min(0).max(100000),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const updateLoyaltyConfigSchema = z.object({
  isEnabled: z.boolean(),
  pointsPerOrder: z.number().int().min(1).max(1000),
  pointsPerSDG: z.number().min(0.1).max(100),
  redemptionThreshold: z.number().int().min(10).max(10000),
  redemptionValueSDG: z.number().min(0.5).max(1000),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdateLoyaltyConfigInput = z.infer<typeof updateLoyaltyConfigSchema>;
