import { z } from 'zod';

export const createCommissionPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['PERCENTAGE', 'FLAT_FEE', 'HYBRID', 'SUBSCRIPTION']),
  rate: z.coerce.number().min(0).max(100),
  minFee: z.coerce.number().min(0).optional().default(0),
  currency: z.string().default('SDG'),
  isDefault: z.boolean().optional().default(false),
});

export const updateCommissionPlanSchema = createCommissionPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const assignCommissionPlanSchema = z.object({
  merchantId: z.string().cuid(),
  planId: z.string().cuid(),
});

export const createSettlementSchema = z.object({
  merchantId: z.string().cuid(),
  periodFrom: z.coerce.date(),
  periodTo: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const createDeliveryZoneSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  baseFee: z.coerce.number().min(0),
  perKmFee: z.coerce.number().min(0).optional().default(0),
  maxDistanceKm: z.coerce.number().min(0).optional(),
  estimatedTime: z.string().max(50).optional(),
  currency: z.string().default('SDG'),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const financeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  merchantId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
});

export type CreateCommissionPlanInput = z.infer<typeof createCommissionPlanSchema>;
export type UpdateCommissionPlanInput = z.infer<typeof updateCommissionPlanSchema>;
export type AssignCommissionPlanInput = z.infer<typeof assignCommissionPlanSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;
export type FinanceFilterInput = z.infer<typeof financeFilterSchema>;
