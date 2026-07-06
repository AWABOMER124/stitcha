/**
 * @module notifications
 * @description Pre-configured notification service singleton with all channel providers.
 */

import type { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { InAppProvider } from './providers/in-app.provider';
import { SMSProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import type { NotificationProvider } from './types';

// Register channel → provider mappings.
//
// EMAIL, SMS, and WHATSAPP are console-logging mocks (see their files) until
// real credentials are configured. To go live, set the relevant env vars
// below and swap the provider instance here — nothing else in the app needs
// to change, since callers only ever depend on the NotificationProvider interface.
//   EMAIL:    set RESEND_API_KEY or SENDGRID_API_KEY, then swap EmailProvider
//   SMS:      set TWILIO_ACCOUNT_SID/AUTH_TOKEN or AFRICASTALKING_API_KEY, then swap SMSProvider
//   WHATSAPP: set WHATSAPP_CLOUD_API_TOKEN or TWILIO_WHATSAPP_* or 360DIALOG_API_KEY, then swap WhatsAppProvider
const providers = new Map<NotificationChannel, NotificationProvider>([
  ['IN_APP', new InAppProvider()],
  ['SMS', new SMSProvider()],
  ['EMAIL', new EmailProvider()],
  ['WHATSAPP', new WhatsAppProvider()],
  // 'PUSH' is not yet implemented — notifications for this channel will be skipped with a warning
]);

if (process.env.NODE_ENV === 'production') {
  const hasRealEmailProvider = Boolean(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
  const hasRealSmsProvider = Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.AFRICASTALKING_API_KEY);
  const hasRealWhatsAppProvider = Boolean(
    process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.TWILIO_WHATSAPP_ACCOUNT_SID || process.env.DIALOG360_API_KEY,
  );
  if (!hasRealEmailProvider || !hasRealSmsProvider || !hasRealWhatsAppProvider) {
    console.warn(
      '[notifications] Running in production without a real EMAIL/SMS/WHATSAPP provider configured — ' +
      'notifications are only logged to the console and NotificationLog, not actually delivered.',
    );
  }
}

/** Pre-configured notification service singleton. */
export const notificationService = new NotificationService(providers);

// Re-export types and classes for convenience
export { NotificationService } from './notification.service';
export type { NotificationPayload, NotificationProvider } from './types';
