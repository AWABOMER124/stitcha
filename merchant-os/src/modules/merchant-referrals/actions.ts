'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { reviewReferralCommission, reviewReferralReward, updateReferralProgram } from './merchant-referrals.service';

const programSchema = z.object({
  isActive: z.string().optional(),
  qualificationRule: z.enum(['FIRST_DELIVERED_ORDER', 'FIRST_PAID_PRO']),
  rewardType: z.enum(['PRO_DAYS', 'AI_CREDITS', 'ACCOUNT_CREDIT', 'CASH']),
  rewardValue: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.string().trim().max(6).optional(),
  holdDays: z.coerce.number().int().min(0).max(180),
  commissionRate: z.coerce.number().gt(0).max(100),
  commissionMonths: z.coerce.number().int().min(1).max(24),
  minimumPayout: z.coerce.number().min(0).max(1_000_000_000),
  terms: z.string().trim().max(2000).optional(),
});

export async function updateReferralProgramAction(formData: FormData) {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateReferralProgram({ ...parsed.data, isActive: parsed.data.isActive === 'true' });
  revalidatePath('/admin/referrals');
  revalidatePath('/dashboard/referrals');
}

export async function reviewReferralCommissionAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const parsed = z.object({
    commissionId: z.string().cuid(), decision: z.enum(['APPROVE', 'REJECT', 'FULFILL']),
    note: z.string().trim().max(500).optional(), fulfillmentRef: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await reviewReferralCommission({ ...parsed.data, reviewerId: actor.id });
  revalidatePath('/admin/referrals');
  revalidatePath('/dashboard/referrals');
}

export async function reviewReferralRewardAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const parsed = z.object({
    rewardId: z.string().cuid(), decision: z.enum(['APPROVE', 'REJECT', 'FULFILL']),
    note: z.string().trim().max(500).optional(), fulfillmentRef: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await reviewReferralReward({ ...parsed.data, reviewerId: actor.id });
  revalidatePath('/admin/referrals');
  revalidatePath('/dashboard/referrals');
}
