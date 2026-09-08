'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { ValidationError } from '@/lib/errors';
import { reviewAcquisitionApplication, reviewProductApplication } from './marketer-applications.service';
import prisma from '@/lib/db/prisma';
import { backfillMarketerMerchantReferral } from '@/modules/marketer-referrals/marketer-referrals.service';

const reviewSchema = z.object({
  applicationId: z.string().cuid(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
});

const backfillReferralSchema = z.object({
  merchantSlug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  marketerCode: z.string().trim().min(9).max(27),
});

export async function backfillMarketerMerchantReferralAction(formData: FormData) {
  let notice = '';
  let outcome: 'success' | 'error' = 'error';
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
    const parsed = backfillReferralSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) notice = 'راجع رابط المتجر ورمز المسوّق.';
    else {
    const referral = await prisma.$transaction(tx => backfillMarketerMerchantReferral(tx, { merchantSlug: parsed.data.merchantSlug, code: parsed.data.marketerCode }));
      if (!referral) notice = 'لم يتم الإسناد: تأكد من تفعيل البرنامج وصحة رمز المسوّق.';
      else if (referral.status === 'REJECTED') notice = 'رفض النظام الإسناد لحماية البرنامج من الإحالة المكررة أو الذاتية.';
      else { notice = 'تم إسناد التاجر للمسوّق بنجاح وتحديث العمولة إن كان الاشتراك مدفوعاً.'; outcome = 'success'; }
    }
  } catch (error) {
    console.error('[marketer-referral] assignment failed', error);
    notice = error instanceof Error ? error.message : 'تعذر إسناد الإحالة حالياً.';
  }
  revalidatePath('/admin/referrals');
  revalidatePath('/admin/marketers');
  redirect(`/admin/referrals?assignment=${outcome}&notice=${encodeURIComponent(notice)}`);
}

export async function reviewAcquisitionApplicationAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب المراجعة غير صالح');
  await reviewAcquisitionApplication({ ...parsed.data, reviewerId: actor.id });
  revalidatePath('/admin/marketers');
}

export async function reviewProductApplicationAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب المراجعة غير صالح');
  await reviewProductApplication({ ...parsed.data, merchantId: auth.merchantId, reviewerId: auth.userId });
  revalidatePath('/dashboard/affiliates/applications');
  revalidatePath('/dashboard/affiliates');
}
