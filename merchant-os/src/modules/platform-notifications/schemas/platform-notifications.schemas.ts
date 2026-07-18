import { z } from 'zod';

// ============================================================================
// Platform Notifications Module — Validation Schemas
// ============================================================================

export const createPlatformNotificationSchema = z.object({
  type: z.enum(['NEW_DISTRIBUTOR', 'SYSTEM']),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
});

export const markPlatformNotificationsReadSchema = z.object({
  ids: z.array(z.string()),
});

export type CreatePlatformNotificationInput = z.infer<typeof createPlatformNotificationSchema>;
export type MarkPlatformNotificationsReadInput = z.infer<typeof markPlatformNotificationsReadSchema>;
