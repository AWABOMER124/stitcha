import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { EmailProvider } from '@/services/notifications/providers/email.provider';
import { WhatsAppProvider, assertWhatsAppOtpConfigured } from '@/services/notifications/providers/whatsapp.provider';

export type AccountVerificationChannel = 'EMAIL' | 'WHATSAPP';

export class AccountVerificationError extends Error {}

export function whatsappAccountVerificationEnabled() {
  return process.env.WHATSAPP_ACCOUNT_VERIFICATION_ENABLED === 'true';
}

export function accountVerificationChannels() {
  let whatsapp = whatsappAccountVerificationEnabled();
  if (whatsapp) {
    try { assertWhatsAppOtpConfigured(); } catch { whatsapp = false; }
  }
  return { email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), whatsapp };
}

export function accountCodeHash(userId: string, channel: AccountVerificationChannel, target: string, code: string) {
  const secret = process.env.PHONE_OTP_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new AccountVerificationError('إعداد حماية رمز التحقق غير مكتمل');
  return createHmac('sha256', secret).update(JSON.stringify([userId, channel, target, code])).digest('hex');
}

export async function sendAccountCode(
  userId: string,
  channel: AccountVerificationChannel,
  audience: 'merchant' | 'marketer' | 'partner' = 'merchant',
) {
  const available = accountVerificationChannels();
  if (!(channel === 'EMAIL' ? available.email : available.whatsapp)) {
    throw new AccountVerificationError('قناة الإرسال غير مهيأة حالياً؛ اختر القناة الأخرى أو تواصل مع دعم وصلة');
  }
  const code = String(randomInt(100000, 1000000));
  const challenge = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const target = channel === 'EMAIL' ? user.email : user.phone;
    if (!target) throw new AccountVerificationError('لا توجد وسيلة اتصال مسجلة لهذه القناة');
    if (channel === 'EMAIL' && user.emailVerified) return { target, alreadyVerified: true as const, id: null };
    if (channel === 'WHATSAPP' && user.phoneVerifiedAt) return { target, alreadyVerified: true as const, id: null };
    const recent = await tx.partnerVerificationChallenge.findMany({
      where: { userId, createdAt: { gt: new Date(Date.now() - 3_600_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent.length >= 5 || (recent[0] && recent[0].createdAt.getTime() > Date.now() - 60_000)) {
      throw new AccountVerificationError('انتظر دقيقة بين الرموز؛ الحد الأقصى 5 رموز في الساعة');
    }
    await tx.partnerVerificationChallenge.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    const created = await tx.partnerVerificationChallenge.create({
      data: {
        userId,
        channel,
        target,
        codeHash: accountCodeHash(userId, channel, target, code),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    return { ...created, alreadyVerified: false as const };
  });
  if (challenge.alreadyVerified) return { target: challenge.target, alreadyVerified: true };

  const audienceName = audience === 'partner' ? 'شريك التوصيل' : audience === 'marketer' ? 'المسوّق' : 'التاجر';
  try {
    await (channel === 'EMAIL' ? new EmailProvider() : new WhatsAppProvider()).send({
      type: 'SYSTEM',
      channel,
      recipient: challenge.target,
      title: `تأكيد حساب ${audienceName} في وصلة`,
      body: `رمز تأكيد حسابك في وصلة: ${code}\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`,
      ...(channel === 'WHATSAPP' ? { metadata: { kind: 'whatsapp_authentication', code } } : {}),
    });
  } catch (error) {
    await prisma.partnerVerificationChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
    console.error('[account-verification] Failed to send verification code', { channel, audience, error });
    throw new AccountVerificationError('تعذر إرسال الرمز الآن. حاول لاحقاً أو اختر القناة الأخرى');
  }
  return { target: challenge.target, alreadyVerified: false };
}

export async function verifyAccountCode(userId: string, channel: AccountVerificationChannel, code: string) {
  const available = accountVerificationChannels();
  if (!(channel === 'EMAIL' ? available.email : available.whatsapp)) {
    throw new AccountVerificationError('قناة التحقق هذه متوقفة حالياً');
  }
  if (!/^\d{6}$/.test(code)) throw new AccountVerificationError('أدخل رمزاً من ستة أرقام');
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const row = await tx.partnerVerificationChallenge.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!row || row.usedAt || row.channel !== channel || row.expiresAt <= new Date() || row.attempts >= 5) {
      return 'الرمز منتهٍ أو مستهلك أو تجاوز عدد المحاولات؛ اطلب رمزاً جديداً';
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const target = channel === 'EMAIL' ? user.email : user.phone;
    if (target !== row.target) return 'تغيّرت بيانات الحساب؛ اطلب رمزاً جديداً';
    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(accountCodeHash(userId, channel, row.target, code), 'hex');
    await tx.partnerVerificationChallenge.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'رمز التحقق غير صحيح';
    await tx.partnerVerificationChallenge.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await tx.user.update({
      where: { id: userId },
      data: channel === 'EMAIL' ? { emailVerified: new Date() } : { phoneVerifiedAt: new Date() },
    });
    return null;
  });
  if (result) throw new AccountVerificationError(result);
  return { verified: true };
}
