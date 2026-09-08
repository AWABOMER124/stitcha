'use server';

import { revalidatePath } from 'next/cache';
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
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
    const parsed = backfillReferralSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    const referral = await prisma.$transaction(tx => backfillMarketerMerchantReferral(tx, { merchantSlug: parsed.data.merchantSlug, code: parsed.data.marketerCode }));
    if (!referral || referral.status === 'REJECTED') return;
    revalidatePath('/admin/referrals');
    revalidatePath('/admin/marketers');
    return;
  } catch (error) {
    console.error('[marketer-referral] assignment failed', error);
    return;
  }
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
