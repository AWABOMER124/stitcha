'use server';
import { revalidatePath } from 'next/cache';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sendPartnerCode, verifyPartnerCode, partnerChannel, changePartnerPassword, PartnerSecurityError } from '@/modules/delivery-partners/services/partner-security.service';
export type SecurityResult = { error?: string; message?: string; signedOut?: boolean };
export async function securityAction(_previous: SecurityResult, form: FormData): Promise<SecurityResult> {
  const { userId } = await requireDeliveryPartner();
  if (!checkRateLimit(`partner-security:${userId}`, 20, 900000)) return { error: 'محاولات كثيرة؛ حاول لاحقاً' };
  try {
    const intent = form.get('intent');
    if (intent === 'password') {
      const next = String(form.get('newPassword') ?? '');
      if (next !== form.get('confirmation')) return { error: 'كلمتا المرور غير متطابقتين' };
      await changePartnerPassword(userId, String(form.get('currentPassword') ?? ''), next);
      return { message: 'تم تغيير كلمة المرور وإبطال الجلسات السابقة. سجّل الدخول مجدداً.', signedOut: true };
    }
    const channel = partnerChannel.parse(form.get('channel'));
    if (intent === 'send') { await sendPartnerCode(userId, channel); return { message: 'تم إرسال الرمز. صلاحيته 10 دقائق، وانتظر دقيقة قبل إعادة الإرسال.' }; }
    if (intent !== 'verify') return { error: 'طلب غير صالح' };
    await verifyPartnerCode(userId, channel, String(form.get('code') ?? ''));
    revalidatePath('/partner');
    revalidatePath('/partner/security');
    return { message: 'تم تأكيد الحساب بنجاح.' };
  } catch (error) { return { error: error instanceof PartnerSecurityError ? error.message : 'تعذرت العملية؛ راجع البيانات وحاول لاحقاً' }; }
}
