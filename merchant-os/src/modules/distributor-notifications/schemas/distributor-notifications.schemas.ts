import { z } from 'zod';

// ============================================================================
// Distributor Notifications Module — Validation Schemas
// ============================================================================

export const createDistributorNotificationSchema = z.object({
  type: z.enum(['NEW_MERCHANT', 'SYSTEM']),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export const markDistributorNotificationsReadSchema = z.object({
  ids: z.array(z.string()),
});

export type CreateDistributorNotificationInput = z.infer<typeof createDistributorNotificationSchema>;
export type MarkDistributorNotificationsReadInput = z.infer<typeof markDistributorNotificationsReadSchema>;
