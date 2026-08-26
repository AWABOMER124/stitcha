import type { NotificationPayload, NotificationProvider } from '../types';

export class SMSProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_SMS_FROM;
    if (!accountSid || !authToken || !from) {
      throw new Error('SMS delivery is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM are required)');
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: payload.recipient, From: from, Body: payload.body }),
      },
    );

    if (!response.ok) {
      throw new Error(`SMS provider rejected the message (${response.status}): ${await safeError(response)}`);
    }
  }
}

async function safeError(response: Response): Promise<string> {
  return (await response.text()).replace(/[\r\n]+/g, ' ').slice(0, 300) || 'empty response';
}
