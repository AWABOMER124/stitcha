import { afterEach, describe, expect, it } from 'vitest';
import { accountCodeHash, accountVerificationChannels } from './account-verification.service';

const original = {
  PHONE_OTP_SECRET: process.env.PHONE_OTP_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  WHATSAPP_ACCOUNT_VERIFICATION_ENABLED: process.env.WHATSAPP_ACCOUNT_VERIFICATION_ENABLED,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('account verification security', () => {
  it('binds an OTP hash to the user, channel and current destination', () => {
    process.env.PHONE_OTP_SECRET = 'test-secret-with-enough-entropy';
    const base = accountCodeHash('user-1', 'EMAIL', 'owner@example.com', '123456');
    expect(accountCodeHash('user-1', 'EMAIL', 'owner@example.com', '123456')).toBe(base);
    expect(accountCodeHash('user-2', 'EMAIL', 'owner@example.com', '123456')).not.toBe(base);
    expect(accountCodeHash('user-1', 'WHATSAPP', 'owner@example.com', '123456')).not.toBe(base);
    expect(accountCodeHash('user-1', 'EMAIL', 'changed@example.com', '123456')).not.toBe(base);
  });

  it('only exposes email verification when both provider settings exist', () => {
    process.env.WHATSAPP_ACCOUNT_VERIFICATION_ENABLED = 'false';
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    expect(accountVerificationChannels()).toEqual({ email: false, whatsapp: false });
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'WASLA <no-reply@example.com>';
    expect(accountVerificationChannels()).toEqual({ email: true, whatsapp: false });
  });
});
