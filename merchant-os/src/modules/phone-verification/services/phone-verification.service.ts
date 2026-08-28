import crypto from 'crypto';
import { ValidationError, NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/phone-verification.repository';
import { assertWhatsAppOtpConfigured, WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashCode(code: string): string {
  const secret = process.env.PHONE_OTP_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('إعداد حماية رمز التحقق غير مكتمل');
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}

/** Generate a fresh OTP and send it to the user's phone via WhatsApp. */
export async function sendOtp(userId: string) {
  const user = await repo.getUserForOtp(userId);
  if (!user) throw new NotFoundError('User');
  if (!user.phone) throw new ValidationError('No phone number on this account');
  if (user.phoneVerifiedAt) return { phone: user.phone, expiresInMinutes: 0, alreadyVerified: true };

  assertWhatsAppOtpConfigured();

  const latest = await repo.findLatest(userId);
  if (latest && latest.createdAt.getTime() > Date.now() - RESEND_COOLDOWN_MS) {
    throw new ValidationError('انتظر دقيقة قبل طلب رمز جديد');
  }
  const recentCount = await repo.countCreatedSince(userId, new Date(Date.now() - 60 * 60 * 1000));
  if (recentCount >= MAX_SENDS_PER_HOUR) {
    throw new ValidationError('تم تجاوز حد إرسال الرموز — حاول بعد ساعة');
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  try {
    await new WhatsAppProvider().send({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: user.phone,
      title: 'رمز تأكيد الحساب — وصلة',
      body: `رمز التحقق الخاص بك هو: ${code}\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`,
      metadata: { kind: 'whatsapp_authentication', code },
    });
  } catch (err) {
    console.error('[phone-verification] Failed to send WhatsApp OTP:', err);
    throw new ValidationError('تعذر إرسال رمز واتساب الآن — حاول مرة أخرى');
  }

  await repo.expirePending(userId);
  await repo.create(userId, user.phone, codeHash, expiresAt);

  return { phone: user.phone, expiresInMinutes: CODE_TTL_MS / 60000, alreadyVerified: false };
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

  const actual = Buffer.from(hashCode(code), 'hex');
  const expected = Buffer.from(pending.codeHash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    await repo.incrementAttempts(pending.id);
    throw new ValidationError('كود التحقق غير صحيح');
  }

  await repo.markVerified(pending.id);
  await repo.markUserPhoneVerified(userId);

  return { verified: true };
}
