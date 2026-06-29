import { z } from 'zod';

// ============================================================================
// Notifications Module — Validation Schemas
// ============================================================================

export const createNotificationSchema = z.object({
  type: z.enum(['NEW_ORDER', 'ORDER_STATUS', 'LOW_STOCK', 'SYSTEM']),
  channel: z.enum(['IN_APP', 'SMS', 'EMAIL', 'PUSH']),
  recipient: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export const markReadSchema = z.object({
  ids: z.array(z.string()),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
