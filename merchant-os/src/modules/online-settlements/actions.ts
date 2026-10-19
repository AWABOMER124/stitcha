'use server';

import { revalidatePath } from 'next/cache';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { markOnlineSettlementPaid } from './online-settlements.service';

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
