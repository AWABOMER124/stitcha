import * as platformNotificationsRepo from '../repositories/platform-notifications.repository';
import type { CreatePlatformNotificationInput } from '../schemas/platform-notifications.schemas';

// ============================================================================
// Platform Notifications Module — Business logic
// ============================================================================

export async function getNotifications(filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
  return platformNotificationsRepo.findAll(filters);
}

export async function sendNotification(data: CreatePlatformNotificationInput) {
  return platformNotificationsRepo.create(data);
}

export async function markAsRead(ids: string[]) {
  return platformNotificationsRepo.markAsRead(ids);
}

export async function getUnreadCount() {
  return platformNotificationsRepo.countUnread();
}
