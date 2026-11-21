'use server';

import { revalidatePath } from 'next/cache';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { markOnlineSettlementPaid } from './online-settlements.service';
import { reconcilePaymobFee } from '@/modules/paymob-payments/paymob-fees.service';
import { ValidationError } from '@/lib/errors';

export async function reconcilePaymobFeeAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const value = String(formData.get('fee') ?? '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new ValidationError('أدخل الرسوم بالريال بدقتين عشريتين كحد أقصى.');
  await reconcilePaymobFee({ entryId: String(formData.get('entryId') ?? ''), feeMinor: Math.round(Number(value) * 100), statementReference: String(formData.get('statementReference') ?? ''), actorId: actor.id });
  revalidatePath('/admin/online-settlements'); revalidatePath('/dashboard/finance/online-settlements');
}

export async function markOnlineSettlementPaidAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const id = String(formData.get('id') ?? '');
  const payoutMethod = String(formData.get('payoutMethod') ?? '');
  const payoutReference = String(formData.get('payoutReference') ?? '');
  const notes = String(formData.get('notes') ?? '');
  if (!id) return;
  await markOnlineSettlementPaid({ id, paidById: actor.id, payoutMethod, payoutReference, notes });
  revalidatePath('/admin/online-settlements');
  revalidatePath('/dashboard/finance/online-settlements');
}
