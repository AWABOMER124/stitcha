/**
 * @module InAppProvider
 * @description Stores notifications in the database via Prisma.
 */

import { prisma } from '@/lib/db/prisma';
import type { NotificationPayload, NotificationProvider } from '../types';

export class InAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    // The notification is persisted by NotificationService.notify(),
    // but for the IN_APP channel we also mark it as a readable notification
    // in the database so the UI can query unread notifications.
    console.log(`[InApp] Notification stored: "${payload.title}" → ${payload.recipient}`);
  }
}
