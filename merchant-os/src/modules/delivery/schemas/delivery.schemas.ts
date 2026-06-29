import { z } from 'zod';

// ============================================================================
// Delivery Module — Validation Schemas
// ============================================================================

export const createDeliverySchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(['PICKUP', 'MERCHANT_DELIVERY', 'WASLAK_DELIVERY', 'EXTERNAL_DELIVERY']),
  address: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  fee: z.number().min(0).optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED']),
  notes: z.string().optional(),
});

export const assignDriverSchema = z.object({
  driverName: z.string().min(1),
  driverPhone: z.string().min(1),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
