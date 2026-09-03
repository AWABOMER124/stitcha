'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { ValidationError } from '@/lib/errors';
import {
  createStoreAffiliate,
  reviewStoreAffiliateCommission,
  setStoreAffiliateStatus,
  updateStoreAffiliateProgram,
} from './store-affiliates.service';

const programSchema = z.object({
  isActive: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100),
  attributionDays: z.coerce.number().int().min(1).max(90),
  holdDays: z.coerce.number().int().min(0).max(180),
  minimumPayout: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.string().trim().min(3).max(6),
  terms: z.string().trim().max(3000).optional(),
});

export async function updateStoreAffiliateProgramAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('راجع إعدادات برنامج العمولة');
  await updateStoreAffiliateProgram(auth.merchantId, { ...parsed.data, isActive: parsed.data.isActive === 'true' });
  revalidatePath('/dashboard/affiliates');
}

export async function createStoreAffiliateAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(32),
    email: z.string().trim().email().optional().or(z.literal('')),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('بيانات المسوّق غير مكتملة');
  await createStoreAffiliate(auth.merchantId, parsed.data);
  revalidatePath('/dashboard/affiliates');
}

export async function setStoreAffiliateStatusAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = z.object({ affiliateId: z.string().cuid(), status: z.enum(['ACTIVE', 'SUSPENDED']) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب تعديل المسوّق غير صالح');
  await setStoreAffiliateStatus(auth.merchantId, parsed.data.affiliateId, parsed.data.status);
  revalidatePath('/dashboard/affiliates');
}

export async function reviewStoreAffiliateCommissionAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'invoices:update');
  const parsed = z.object({
    commissionId: z.string().cuid(),
    decision: z.enum(['APPROVE', 'REJECT', 'PAY']),
    note: z.string().trim().max(500).optional(),
    paymentRef: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب مراجعة العمولة غير صالح');
  await reviewStoreAffiliateCommission({ merchantId: auth.merchantId, reviewerId: auth.userId, ...parsed.data });
  revalidatePath('/dashboard/affiliates');
}
