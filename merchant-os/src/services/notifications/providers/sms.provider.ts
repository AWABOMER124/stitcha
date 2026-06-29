/**
 * @module SMSProvider
 * @description Mock SMS provider — logs to console instead of sending real SMS.
 * Replace with Twilio, Africa's Talking, or similar in production.
 */

import type { NotificationPayload, NotificationProvider } from '../types';

export class SMSProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('📱 [SMS] Mock SMS Notification');
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
