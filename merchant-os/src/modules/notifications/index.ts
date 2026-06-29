/**
 * Notifications Module — Public API
 */

export {
  getNotificationsAction,
  sendNotificationAction,
  markAsReadAction,
  getUnreadCountAction,
} from './actions';

export {
  getNotifications,
  sendNotification,
  markAsRead,
  getUnreadCount,
} from './services/notifications.service';

export {
  createNotificationSchema,
  markReadSchema,
} from './schemas/notifications.schemas';

export type {
  CreateNotificationInput,
  MarkReadInput,
  NotificationLog,
  NotificationType,
  NotificationChannel,
} from './types';
