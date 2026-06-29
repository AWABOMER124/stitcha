import { z } from 'zod';

export const advanceOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED']),
  note: z.string().max(500).optional(),
});

export const fulfillmentFilterSchema = z.object({
  branchId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;
export type FulfillmentFilterInput = z.infer<typeof fulfillmentFilterSchema>;
