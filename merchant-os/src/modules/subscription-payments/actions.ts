'use server';

import { revalidatePath } from 'next/cache';
import { handleActionError } from '@/lib/errors/handler';
import type { ActionResult } from '@/lib/types';
import { z } from 'zod';
import {
  createPlatformPaymentAccount,
  reviewSubscriptionPayment,
  setPlatformPaymentAccountActive,
} from './subscription-payments.service';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

const paymentAccountSchema = z.object({
  channel: z.enum(['BANKAK', 'MYCASHY', 'OTHER']),
  label: z.string().trim().min(2).max(80),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(3).max(100),
  instructions: z.string().trim().max(500).optional(),
  monthlyAmount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().min(3).max(6).regex(/^[A-Za-z]+$/),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function createPaymentAccountAction(formData: FormData) {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);
  const parsed = paymentAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await createPlatformPaymentAccount(parsed.data);
  revalidatePath('/admin/subscription-payments');
}

export async function togglePaymentAccountAction(formData: FormData) {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);
  const id = String(formData.get('id') ?? '');
  const isActive = String(formData.get('isActive')) === 'true';
  if (!id) return;
  await setPlatformPaymentAccountActive(id, isActive);
  revalidatePath('/admin/subscription-payments');
  revalidatePath('/dashboard/subscription');
}

export async function reviewSubscriptionPaymentFormAction(formData: FormData) {
  const user = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const paymentId = String(formData.get('paymentId') ?? '');
  const decision = String(formData.get('decision'));
  const reason = String(formData.get('reason') ?? '');
  if (!paymentId || (decision !== 'VERIFY' && decision !== 'REJECT')) return;
  await reviewSubscriptionPayment(paymentId, user.id, decision, reason);
  revalidatePath('/admin/subscription-payments');
  revalidatePath('/dashboard/subscription');
}

export async function reviewSubscriptionPaymentAction(input: { paymentId: string; decision: 'VERIFY' | 'REJECT'; reason?: string }): Promise<ActionResult<{ success: true }>> {
  try {
    const user = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
    await reviewSubscriptionPayment(input.paymentId, user.id, input.decision, input.reason);
    revalidatePath('/admin/subscription-payments');
    revalidatePath('/dashboard/subscription');
    return { success: true, data: { success: true } };
  } catch (error) { return handleActionError(error); }
}
