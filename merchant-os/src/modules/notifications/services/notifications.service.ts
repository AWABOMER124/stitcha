import * as notificationsRepo from '../repositories/notifications.repository';
import type { CreateNotificationInput } from '../schemas/notifications.schemas';

// ============================================================================
// Notifications Service — Business logic
// ============================================================================

/** Get paginated notifications with optional filters */
export async function getNotifications(
  merchantId: string,
  filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }
) {
  return notificationsRepo.findAll(merchantId, filters);
}

/** Send a notification (creates a log entry) */
export async function sendNotification(merchantId: string, data: CreateNotificationInput) {
  return notificationsRepo.create(merchantId, data);
}

/** Mark notifications as read */
export async function markAsRead(merchantId: string, ids: string[]) {
  return notificationsRepo.markAsRead(merchantId, ids);
}

/** Get count of unread notifications */
export async function getUnreadCount(merchantId: string) {
  return notificationsRepo.countUnread(merchantId);
}
