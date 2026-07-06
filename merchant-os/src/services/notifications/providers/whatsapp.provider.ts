/**
 * @module WhatsAppProvider
 * @description Mock WhatsApp provider — logs to console instead of sending a
 * real WhatsApp message. Swap for Meta Cloud API, Twilio WhatsApp, or
 * 360dialog once real Business API credentials are configured — nothing
 * else in the app needs to change, callers only depend on NotificationProvider.
 */

import type { NotificationPayload, NotificationProvider } from '../types';

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('💬 [WhatsApp] Mock WhatsApp Notification');
    console.log('───────────────────────────────────────────');
    console.log(`  To:      ${payload.recipient}`);
    console.log(`  Title:   ${payload.title}`);
    console.log(`  Body:    ${payload.body}`);
    if (payload.metadata) {
      console.log(`  Meta:    ${JSON.stringify(payload.metadata)}`);
    }
    console.log('═══════════════════════════════════════════');
  }
}
