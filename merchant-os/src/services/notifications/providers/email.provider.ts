/**
 * @module EmailProvider
 * @description Mock email provider — logs to console instead of sending real emails.
 * Replace with SendGrid, Resend, or similar in production.
 */

import type { NotificationPayload, NotificationProvider } from '../types';

export class EmailProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('📧 [Email] Mock Email Notification');
    console.log('───────────────────────────────────────────');
    console.log(`  To:      ${payload.recipient}`);
    console.log(`  Subject: ${payload.title}`);
    console.log(`  Body:    ${payload.body}`);
    if (payload.metadata) {
      console.log(`  Meta:    ${JSON.stringify(payload.metadata)}`);
    }
    console.log('═══════════════════════════════════════════');
  }
}
