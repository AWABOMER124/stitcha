import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import {
  AccountVerificationError,
  accountCodeHash,
  accountVerificationChannels,
  sendAccountCode,
  verifyAccountCode,
} from '@/modules/account-verification/account-verification.service';

export const partnerChannel = z.enum(['EMAIL', 'WHATSAPP']);
export const partnerPassword = z.string().min(8).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72);
type Channel = z.infer<typeof partnerChannel>;
export class PartnerSecurityError extends AccountVerificationError {}
export const partnerCodeHash = accountCodeHash;
export const verificationChannels = accountVerificationChannels;
export async function sendPartnerCode(userId: string, channel: Channel) {
  try { return await sendAccountCode(userId, channel, 'partner'); }
  catch (error) { throw new PartnerSecurityError(error instanceof Error ? error.message : 'تعذر إرسال الرمز'); }
}
export async function verifyPartnerCode(userId: string, channel: Channel, code: string) {
  try { return await verifyAccountCode(userId, channel, code); }
  catch (error) { throw new PartnerSecurityError(error instanceof Error ? error.message : 'تعذر تأكيد الرمز'); }
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
