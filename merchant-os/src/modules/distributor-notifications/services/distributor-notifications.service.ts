import * as distributorNotificationsRepo from '../repositories/distributor-notifications.repository';
import type { CreateDistributorNotificationInput } from '../schemas/distributor-notifications.schemas';

// ============================================================================
// Distributor Notifications Module — Business logic
// ============================================================================

export async function getNotifications(
  distributorId: string,
  filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }
) {
  return distributorNotificationsRepo.findAll(distributorId, filters);
}

export async function sendNotification(distributorId: string, data: CreateDistributorNotificationInput) {
  return distributorNotificationsRepo.create(distributorId, data);
}

export async function markAsRead(distributorId: string, ids: string[]) {
  return distributorNotificationsRepo.markAsRead(distributorId, ids);
}

export async function getUnreadCount(distributorId: string) {
  return distributorNotificationsRepo.countUnread(distributorId);
}
