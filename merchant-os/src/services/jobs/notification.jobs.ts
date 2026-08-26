import type { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret';
import { EmailProvider } from '@/services/notifications/providers/email.provider';
import { SMSProvider } from '@/services/notifications/providers/sms.provider';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';
import type { NotificationPayload, NotificationProvider } from '@/services/notifications/types';
import { enqueueJob, type OutboxClient, type OutboxHandlers } from './outbox.service';

export const MERCHANT_NOTIFICATION_TOPIC = 'notification.merchant.in-app';
export const EXTERNAL_NOTIFICATION_TOPIC = 'notification.external.encrypted';

const externalProviders = new Map<NotificationChannel, NotificationProvider>([
  ['EMAIL', new EmailProvider()],
  ['SMS', new SMSProvider()],
  ['WHATSAPP', new WhatsAppProvider()],
]);

export async function enqueueExternalNotification(
  payload: NotificationPayload,
  idempotencyKey: string,
  client: OutboxClient = prisma,
) {
  if (!externalProviders.has(payload.channel)) {
    throw new Error(`Unsupported external notification channel: ${payload.channel}`);
  }
  return enqueueJob({
    topic: EXTERNAL_NOTIFICATION_TOPIC,
    idempotencyKey,
    maxAttempts: 8,
    payload: { encryptedPayload: encryptSecret(JSON.stringify(payload)) },
  }, client);
}

export const notificationJobHandlers: OutboxHandlers = new Map([
  [
    MERCHANT_NOTIFICATION_TOPIC,
    async (payload: unknown, job) => {
      const notification = parseMerchantNotification(payload);
      await prisma.notificationLog.upsert({
        where: { idempotencyKey: job.id },
        update: {},
        create: { ...notification, idempotencyKey: job.id },
      });
    },
  ],
  [
    EXTERNAL_NOTIFICATION_TOPIC,
    async (payload: unknown) => {
      const notification = parseEncryptedExternalNotification(payload);
      const provider = externalProviders.get(notification.channel);
      if (!provider) throw new Error(`No external provider for channel: ${notification.channel}`);
      await provider.send(notification);
    },
  ],
]);

function parseMerchantNotification(payload: unknown): {
  merchantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
} {
  const value = requireObject(payload);
  const required = ['merchantId', 'type', 'channel', 'recipient', 'title', 'body'];
  if (required.some((key) => typeof value[key] !== 'string' || value[key] === '')) {
    throw new Error('Invalid notification payload fields');
  }
  if (value.channel !== 'IN_APP') throw new Error('Invalid in-app notification channel');
  return {
    merchantId: value.merchantId as string,
    type: value.type as NotificationType,
    channel: 'IN_APP',
    recipient: value.recipient as string,
    title: value.title as string,
    body: value.body as string,
    ...(value.metadata !== undefined && { metadata: value.metadata as Prisma.InputJsonValue }),
  };
}

function parseEncryptedExternalNotification(payload: unknown): NotificationPayload {
  const wrapper = requireObject(payload);
  if (typeof wrapper.encryptedPayload !== 'string') throw new Error('Invalid encrypted notification payload');
  const value = requireObject(JSON.parse(decryptSecret(wrapper.encryptedPayload)));
  const required = ['type', 'channel', 'recipient', 'title', 'body'];
  if (required.some((key) => typeof value[key] !== 'string' || value[key] === '')) {
    throw new Error('Invalid external notification payload fields');
  }
  if (!['EMAIL', 'SMS', 'WHATSAPP'].includes(value.channel as string)) {
    throw new Error('Invalid external notification channel');
  }
  return value as unknown as NotificationPayload;
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid notification payload');
  }
  return value as Record<string, unknown>;
}
