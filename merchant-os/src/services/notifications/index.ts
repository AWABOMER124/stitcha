/**
 * @module notifications
 * @description Pre-configured notification service singleton with all channel providers.
 */

import type { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { InAppProvider } from './providers/in-app.provider';
import { SMSProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';
import type { NotificationProvider } from './types';

// Register channel → provider mappings
const providers = new Map<NotificationChannel, NotificationProvider>([
  ['IN_APP', new InAppProvider()],
  ['SMS', new SMSProvider()],
  ['EMAIL', new EmailProvider()],
  // 'PUSH' is not yet implemented — notifications for this channel will be skipped with a warning
]);

/** Pre-configured notification service singleton. */
export const notificationService = new NotificationService(providers);

// Re-export types and classes for convenience
export { NotificationService } from './notification.service';
export type { NotificationPayload, NotificationProvider } from './types';
