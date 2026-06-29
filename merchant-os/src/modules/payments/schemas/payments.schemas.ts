import { z } from 'zod';

// ============================================================================
// Payments Module — Validation Schemas
// ============================================================================

export const recordPaymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(['CASH', 'CARD', 'ONLINE', 'WALLET']),
  amount: z.number().positive(),
  transactionRef: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
