import crypto from 'crypto';
import { ValidationError, NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/phone-verification.repository';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// Phone verification isn't merchant-scoped (it happens during signup, before
// any Merchant/Distributor necessarily exists), so this sends directly
// through the provider rather than the merchant-scoped NotificationService.
const whatsAppProvider = new WhatsAppProvider();

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Generate a fresh OTP and send it to the user's phone via WhatsApp. */
export async function sendOtp(userId: string) {
  const user = await repo.getUserForOtp(userId);
  if (!user) throw new NotFoundError('User');
  if (!user.phone) throw new ValidationError('No phone number on this account');

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await repo.create(userId, user.phone, codeHash, expiresAt);

  try {
    await whatsAppProvider.send({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: user.phone,
      title: 'رمز تأكيد الحساب — وصلك',
      body: `رمز التحقق الخاص بك هو: ${code}\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`,
    });
  } catch (err) {
    console.error('[phone-verification] Failed to send WhatsApp OTP:', err);
  }

  return { phone: user.phone, expiresInMinutes: CODE_TTL_MS / 60000 };
}

/** Verify a submitted OTP code and, on success, mark the phone as verified. */
export async function verifyOtp(userId: string, code: string) {
  const pending = await repo.findLatestPending(userId);
  if (!pending) throw new ValidationError('لا يوجد كود بانتظار التحقق — اطلب كودًا جديدًا');

  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new ValidationError('تجاوزت عدد المحاولات المسموح — اطلب كودًا جديدًا');
  }
  if (pending.expiresAt < new Date()) {
    throw new ValidationError('انتهت صلاحية الكود — اطلب كودًا جديدًا');
  }

  if (hashCode(code) !== pending.codeHash) {
    await repo.incrementAttempts(pending.id);
    throw new ValidationError('كود التحقق غير صحيح');
  }

  await repo.markVerified(pending.id);
  await repo.markUserPhoneVerified(userId);

  return { verified: true };
}
