'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { ValidationError } from '@/lib/errors';
import { reviewAcquisitionApplication, reviewProductApplication } from './marketer-applications.service';

const reviewSchema = z.object({
  applicationId: z.string().cuid(),
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(500).optional(),
});

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
