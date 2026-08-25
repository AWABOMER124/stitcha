import type { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { InAppProvider } from './providers/in-app.provider';
import { SMSProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import type { NotificationProvider } from './types';

// External providers fail closed when their credentials are absent; no mock
// delivery is ever reported as successful.
const providers = new Map<NotificationChannel, NotificationProvider>([
  ['IN_APP', new InAppProvider()],
  ['SMS', new SMSProvider()],
  ['EMAIL', new EmailProvider()],
  ['WHATSAPP', new WhatsAppProvider()],
]);

export const notificationService = new NotificationService(providers);

export { NotificationService } from './notification.service';
export type { NotificationPayload, NotificationProvider } from './types';
