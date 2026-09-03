'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { ValidationError } from '@/lib/errors';
import { requestMerchantDomain, reviewMerchantDomain, verifyMerchantDomainDns } from './merchant-domains.service';

export async function requestMerchantDomainAction(formData: FormData) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  const parsed = z.object({ hostname: z.string().trim().min(4).max(253) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('اسم النطاق غير صالح');
  await requestMerchantDomain(auth.merchantId, parsed.data.hostname);
  revalidatePath('/dashboard/domains');
}

export async function verifyMerchantDomainDnsAction() {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:update');
  await verifyMerchantDomainDns(auth.merchantId);
  revalidatePath('/dashboard/domains');
  revalidatePath('/admin/domains');
}

export async function reviewMerchantDomainAction(formData: FormData) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const parsed = z.object({ domainId: z.string().cuid(), decision: z.enum(['ACTIVATE', 'REJECT', 'DISABLE']), reason: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new ValidationError('طلب مراجعة النطاق غير صالح');
  await reviewMerchantDomain({ ...parsed.data, reviewerId: actor.id });
  revalidatePath('/admin/domains');
  revalidatePath('/dashboard/domains');
}
