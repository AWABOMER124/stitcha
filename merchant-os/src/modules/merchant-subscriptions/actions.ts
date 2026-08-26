'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentMerchant } from '@/lib/auth/session';
import { handleActionError } from '@/lib/errors/handler';
import type { ActionResult } from '@/lib/types';
import { requestPlanChange } from './merchant-subscriptions.service';

const requestSchema = z.object({
  targetPlanCode: z.literal('PRO'),
  note: z.string().trim().max(500).optional(),
});

export async function requestPlanChangeAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  try {
    const { merchantId } = await getCurrentMerchant();
    const parsed = requestSchema.parse(input);
    const request = await requestPlanChange(merchantId, parsed.targetPlanCode, parsed.note);
    revalidatePath('/dashboard/subscription');
    return { success: true, data: { status: request.status } };
  } catch (error) {
    return handleActionError(error);
  }
}
