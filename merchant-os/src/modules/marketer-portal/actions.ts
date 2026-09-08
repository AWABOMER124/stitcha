'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { saveMarketerPayout, submitMarketerIdentity, updateMarketerProfile, uploadMarketerAvatar, uploadMarketerCv, reviewMarketerIdentity } from './marketer-profile.service';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import prisma from '@/lib/db/prisma';
import { submitMarketerApplication } from '@/modules/marketer-applications/marketer-applications.service';

async function marketerUser() { const session = await auth(); if (!session?.user?.id || session.user.role !== 'MARKETER') throw new UnauthorizedError('Marketer account required'); return session.user.id; }
const payout = z.object({ method: z.enum(['BANK_ACCOUNT', 'BANKAK', 'MYCASHY', 'OTHER']), bankName: z.string().trim().max(120).optional(), accountName: z.string().trim().min(3).max(160), accountNumber: z.string().trim().min(5).max(40), iban: z.string().trim().max(34).optional() });
export async function updateMarketerProfileAction(formData: FormData) { const parsed = z.object({ name: z.string().trim().min(2).max(120), city: z.string().trim().max(120).optional(), bio: z.string().trim().max(1000).optional() }).safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new ValidationError('راجع بيانات الملف الشخصي'); await updateMarketerProfile(await marketerUser(), parsed.data); revalidatePath('/marketer'); }
export async function uploadMarketerAvatarAction(formData: FormData) { const file = formData.get('avatar'); if (!(file instanceof File) || !file.size) throw new ValidationError('اختر صورة شخصية'); await uploadMarketerAvatar(await marketerUser(), file); revalidatePath('/marketer'); }
export async function uploadMarketerCvAction(formData: FormData) { const file = formData.get('cv'); if (!(file instanceof File) || !file.size) throw new ValidationError('اختر ملف السيرة الذاتية'); await uploadMarketerCv(await marketerUser(), file); revalidatePath('/marketer'); }
export async function saveMarketerPayoutAction(formData: FormData) { const parsed = payout.safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new ValidationError('راجع بيانات الحساب'); await saveMarketerPayout(await marketerUser(), parsed.data); revalidatePath('/marketer'); }
export async function submitMarketerIdentityAction(formData: FormData) { const parsed = z.object({ legalName: z.string().trim().min(3).max(160), documentType: z.enum(['NATIONAL_ID', 'PASSPORT']), documentNumber: z.string().trim().min(5).max(40), expiresAt: z.coerce.date() }).safeParse(Object.fromEntries(formData)); const front = formData.get('front'); const back = formData.get('back'); if (!parsed.success || !(front instanceof File) || !front.size) throw new ValidationError('راجع بيانات ووثائق الهوية'); await submitMarketerIdentity(await marketerUser(), parsed.data, front, back instanceof File && back.size ? back : undefined); revalidatePath('/marketer'); }
export async function reviewMarketerIdentityAction(formData: FormData) { const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE); const parsed = z.object({ verificationId: z.string().cuid(), decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData)); if (!parsed.success) throw new ValidationError('طلب المراجعة غير صالح'); await reviewMarketerIdentity(parsed.data.verificationId, actor.id, parsed.data.decision, parsed.data.reason); revalidatePath('/admin/marketers'); }
export async function applyToStoreAffiliateProgramAction(formData: FormData) {
  try {
    const merchantId = z.string().cuid().safeParse(formData.get('merchantId'));
    if (!merchantId.success) return;
    const userId = await marketerUser();
    const account = await prisma.marketerAccount.findUnique({ where: { userId }, include: { user: { select: { name: true, email: true, phone: true } } } });
    if (!account?.user.name || !account.user.phone) return;
    await submitMarketerApplication({ type: 'STOREFRONT_PRODUCTS', merchantId: merchantId.data, marketerAccountId: account.id, name: account.user.name, phone: account.user.phone, email: account.user.email, city: account.city ?? '', channels: ['OTHER'], experience: account.bio ?? undefined });
    revalidatePath('/marketer');
    revalidatePath('/marketer/programs');
    return;
  } catch (error) {
    console.error('[marketer-program] application failed', error);
    return;
  }
}
