'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as notificationsService from './services/notifications.service';
import { createNotificationSchema, markReadSchema } from './schemas/notifications.schemas';
import type { ActionResult, PaginatedResult } from '@/lib/types';
import type { NotificationLog } from '@prisma/client';

// ============================================================================
// Notifications Module — Server Actions
// ============================================================================

/** Get paginated notifications */
export async function getNotificationsAction(
  filters?: unknown
): Promise<ActionResult<PaginatedResult<NotificationLog>>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'notifications:read');
    const result = await notificationsService.getNotifications(
      auth.merchantId,
      filters as { isRead?: boolean; type?: string; page?: number; limit?: number } | undefined
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get notifications' };
  }
}

/** Send a notification */
export async function sendNotificationAction(formData: unknown): Promise<ActionResult<NotificationLog>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'notifications:create');
    const parsed = createNotificationSchema.parse(formData);
    const notification = await notificationsService.sendNotification(auth.merchantId, parsed);
    return { success: true, data: notification };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send notification' };
  }
}

/** Mark notifications as read */
export async function markAsReadAction(formData: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'notifications:update');
    const parsed = markReadSchema.parse(formData);
    const result = await notificationsService.markAsRead(auth.merchantId, parsed.ids);
    return { success: true, data: { count: result.count } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark notifications as read' };
  }
}

/** Get unread notification count */
export async function getUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'notifications:read');
    const count = await notificationsService.getUnreadCount(auth.merchantId);
    return { success: true, data: count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get unread count' };
  }
}
