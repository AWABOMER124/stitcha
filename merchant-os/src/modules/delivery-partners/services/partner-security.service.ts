import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { EmailProvider } from '@/services/notifications/providers/email.provider';
import { WhatsAppProvider, assertWhatsAppOtpConfigured } from '@/services/notifications/providers/whatsapp.provider';

export const partnerChannel = z.enum(['EMAIL', 'WHATSAPP']);
export const partnerPassword = z.string().min(8).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72);
type Channel = z.infer<typeof partnerChannel>;
export class PartnerSecurityError extends Error {}
export function partnerCodeHash(userId: string, channel: Channel, target: string, code: string) {
  const secret = process.env.PHONE_OTP_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new PartnerSecurityError('إعداد حماية رمز التحقق غير مكتمل');
  return createHmac('sha256', secret).update(JSON.stringify([userId, channel, target, code])).digest('hex');
}
export function verificationChannels() {
  let whatsapp = true;
  try { assertWhatsAppOtpConfigured(); } catch { whatsapp = false; }
  return { email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), whatsapp };
}
export async function sendPartnerCode(userId: string, channel: Channel) {
  const available = verificationChannels();
  if (!(channel === 'EMAIL' ? available.email : available.whatsapp)) throw new PartnerSecurityError('قناة الإرسال غير مهيأة حالياً؛ اختر القناة الأخرى أو تواصل مع دعم وصلة');
  const code = String(randomInt(100000, 1000000));
  const challenge = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const target = channel === 'EMAIL' ? user.email : user.phone;
    if (!target) throw new PartnerSecurityError('لا يوجد عنوان مسجل لهذه القناة');
    const recent = await tx.partnerVerificationChallenge.findMany({ where: { userId, createdAt: { gt: new Date(Date.now() - 3600000) } }, orderBy: { createdAt: 'desc' } });
    if (recent.length >= 5 || (recent[0] && recent[0].createdAt.getTime() > Date.now() - 60000)) throw new PartnerSecurityError('انتظر دقيقة بين الرموز؛ الحد الأقصى 5 رموز في الساعة');
    await tx.partnerVerificationChallenge.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
    return tx.partnerVerificationChallenge.create({ data: { userId, channel, target, codeHash: partnerCodeHash(userId, channel, target, code), expiresAt: new Date(Date.now() + 600000) } });
  });
  try {
    const payload = { type: 'SYSTEM' as const, channel, recipient: challenge.target, title: 'تأكيد حساب شريك وصلة', body: `رمز تأكيد حسابك: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أي شخص.`,
      ...(channel === 'WHATSAPP' ? { metadata: { kind: 'whatsapp_authentication', code } } : {}) };
    await (channel === 'EMAIL' ? new EmailProvider() : new WhatsAppProvider()).send(payload);
  } catch {
    await prisma.partnerVerificationChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
    throw new PartnerSecurityError('تعذر إرسال الرمز الآن. حاول لاحقاً أو اختر القناة الأخرى');
  }
}
export async function verifyPartnerCode(userId: string, channel: Channel, code: string) {
  if (!/^\d{6}$/.test(code)) throw new PartnerSecurityError('أدخل رمزاً من ستة أرقام');
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const row = await tx.partnerVerificationChallenge.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!row || row.usedAt || row.channel !== channel || row.expiresAt <= new Date() || row.attempts >= 5) return 'الرمز منتهٍ أو مستهلك أو تجاوز عدد المحاولات؛ اطلب رمزاً جديداً';
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const target = channel === 'EMAIL' ? user.email : user.phone;
    if (target !== row.target) return 'تغيّرت بيانات الحساب؛ اطلب رمزاً جديداً';
    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(partnerCodeHash(userId, channel, row.target, code), 'hex');
    await tx.partnerVerificationChallenge.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'رمز التحقق غير صحيح';
    await tx.partnerVerificationChallenge.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: userId }, data: channel === 'EMAIL' ? { emailVerified: new Date() } : { phoneVerifiedAt: new Date() } });
    return null;
  });
  if (result) throw new PartnerSecurityError(result);
}
export async function changePartnerPassword(userId: string, current: string, next: string) {
  partnerPassword.parse(next);
  if (current.length > 128 || current === next) throw new PartnerSecurityError('اختر كلمة مرور جديدة مختلفة');
  const newHash = await bcrypt.hash(next, 12);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !await bcrypt.compare(current, user.passwordHash)) throw new PartnerSecurityError('كلمة المرور الحالية غير صحيحة');
    await tx.user.update({ where: { id: userId }, data: { passwordHash: newHash, authVersion: { increment: 1 } } });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  });
}
