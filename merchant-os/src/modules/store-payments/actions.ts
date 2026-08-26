'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import {
  createMerchantPaymentAccount,
  reviewOrderPayment,
  setMerchantPaymentAccountActive,
} from './store-payments.service';

const accountSchema = z.object({
  channel: z.enum(['BANKAK', 'MYCASHY', 'OTHER']),
  label: z.string().trim().min(2).max(80),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(3).max(100),
  instructions: z.string().trim().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function createMerchantPaymentAccountAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await createMerchantPaymentAccount(auth.merchantId, parsed.data);
  revalidatePath('/dashboard/storefront/payments');
}

export async function toggleMerchantPaymentAccountAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await setMerchantPaymentAccountActive(auth.merchantId, id, String(formData.get('isActive')) === 'true');
  revalidatePath('/dashboard/storefront/payments');
  revalidatePath('/store', 'layout');
}

export async function reviewOrderPaymentAction(input: { paymentId: string; orderId: string; decision: 'VERIFY' | 'REJECT'; reason?: string }) {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'payments:update');
    await reviewOrderPayment(auth.merchantId, input.paymentId, auth.userId, input.decision, input.reason);
    revalidatePath(`/dashboard/orders/${input.orderId}`);
    return { success: true as const, data: { success: true as const } };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'تعذر مراجعة التحويل' };
  }
}
