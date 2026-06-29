import type { NotificationType, NotificationChannel } from '@prisma/client';

export interface NotificationPayload {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}
