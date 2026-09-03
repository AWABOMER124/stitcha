'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { ValidationError } from '@/lib/errors';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import {
  issueStoreAffiliateOnboarding,
  reviewIdentityVerification,
  saveMerchantReferralPayout,
  submitMerchantIdentity,
  submitStoreAffiliateOnboarding,
} from './identity-verification.service';

const verificationSchema = z.object({
  legalName: z.string().trim().min(3).max(160),
  documentType: z.enum(['NATIONAL_ID', 'PASSPORT']),
  documentNumber: z.string().trim().min(5).max(40),
  expiresAt: z.coerce.date(),
});

const payoutSchema = z.object({
  method: z.enum(['BANK_ACCOUNT', 'BANKAK', 'MYCASHY', 'OTHER']),
  bankName: z.string().trim().max(120).optional(),
  accountName: z.string().trim().min(3).max(160),
  accountNumber: z.string().trim().min(5).max(40),
  iban: z.string().trim().max(34).optional(),
});

function requiredFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) throw new ValidationError('صورة وجه الوثيقة مطلوبة');
  return value;
}

function optionalFile(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : undefined;
}

export async function submitMerchantIdentityAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('راجع بيانات الهوية وتاريخ الانتهاء');
  await submitMerchantIdentity(auth.merchantId, parsed.data, requiredFile(formData, 'front'), optionalFile(formData, 'back'));
  revalidatePath('/dashboard/verification');
}

export async function saveMerchantReferralPayoutAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('راجع بيانات حساب استلام العمولة');
  await saveMerchantReferralPayout(auth.merchantId, parsed.data);
  revalidatePath('/dashboard/verification');
  revalidatePath('/dashboard/referrals');
}

export async function issueStoreAffiliateOnboardingAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = z.object({ affiliateId: z.string().cuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('المسوّق غير صالح');
  const invite = await issueStoreAffiliateOnboarding(auth.merchantId, parsed.data.affiliateId);
  redirect(`/dashboard/affiliates/onboarding?token=${encodeURIComponent(invite.token)}`);
}

export async function submitStoreAffiliateOnboardingAction(token: string, formData: FormData) {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  enforceRateLimit(`affiliate-kyc:${ip}`, 8, 60 * 60_000);
  const parsed = verificationSchema.and(payoutSchema).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('راجع بيانات الهوية والسداد');
  await submitStoreAffiliateOnboarding(token, parsed.data, requiredFile(formData, 'front'), optionalFile(formData, 'back'));
  redirect('/affiliate-onboarding/complete');
}

export async function reviewIdentityVerificationAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const parsed = z.object({
    kind: z.enum(['MERCHANT', 'AFFILIATE']),
    verificationId: z.string().cuid(),
    decision: z.enum(['APPROVE', 'REJECT']),
    reason: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب المراجعة غير صالح');
  await reviewIdentityVerification({ ...parsed.data, reviewerId: actor.id });
  revalidatePath('/admin/verifications');
}
