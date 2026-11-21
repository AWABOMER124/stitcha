'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { UnauthorizedError } from '@/lib/errors';
import { z } from 'zod';
import { getCurrentMerchant } from '@/lib/auth/session';
import { handleActionError } from '@/lib/errors/handler';
import type { ActionResult } from '@/lib/types';
import { requestPlanChange } from './merchant-subscriptions.service';

const requestSchema = z.object({
  // The public catalog may offer several paid tiers.  FREE is deliberately
  // excluded: downgrades are an explicit support operation, not a checkout.
  targetPlanCode: z.enum(['GROWTH', 'PRO', 'BUSINESS', 'SA_GROWTH', 'SA_PRO', 'SA_BUSINESS']),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  note: z.string().trim().max(500).optional(),
});

/** Prepare the exact quote, then navigate; no charge or plan activation here. */
export async function beginSubscriptionCheckoutAction(input: unknown): Promise<ActionResult<never>> {
  let requestId: string;
  try {
    const session = await auth();
    if (!session?.user?.merchantId || !['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(session.user.role)) {
      throw new UnauthorizedError('Only the store owner or administrator may manage subscriptions');
    }
    const parsed = requestSchema.parse(input);
    const request = await requestPlanChange(session.user.merchantId, parsed.targetPlanCode, parsed.note, parsed.billingInterval, { notifyPlatform: false });
    requestId = request.id;
  } catch (error) { return handleActionError(error); }
  redirect(`/dashboard/subscription/checkout?request=${encodeURIComponent(requestId)}`);
}

export async function requestPlanChangeAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  try {
    const { merchantId } = await getCurrentMerchant();
    const parsed = requestSchema.parse(input);
    const request = await requestPlanChange(merchantId, parsed.targetPlanCode, parsed.note, parsed.billingInterval);
    revalidatePath('/dashboard/subscription');
    return { success: true, data: { status: request.status } };
  } catch (error) {
    return handleActionError(error);
  }
}
