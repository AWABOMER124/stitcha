'use server';

import { revalidatePath } from 'next/cache';
import { handleActionError } from '@/lib/errors/handler';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import type { ActionResult } from '@/lib/types';
import { updateAdminMerchantPlan } from './admin-plan.service';
import { PLAN_BOOLEAN_FIELDS, PLAN_LIMIT_FIELDS } from './plan-fields';

export async function updateMerchantPlanAction(
  _previous: ActionResult<{ code: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ code: string }>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    const code = String(formData.get('code') ?? '');
    await updateAdminMerchantPlan({
      id: String(formData.get('id') ?? ''),
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      monthlyPrice: Number(formData.get('monthlyPrice')),
      currency: String(formData.get('currency') ?? ''),
      sortOrder: Number(formData.get('sortOrder')),
      isPublic: formData.get('isPublic') === 'on',
      isActive: formData.get('isActive') === 'on',
      limits: Object.fromEntries(PLAN_LIMIT_FIELDS.map((key) => [key, Number(formData.get(key))])),
      flags: Object.fromEntries(PLAN_BOOLEAN_FIELDS.map((key) => [key, formData.get(key) === 'on'])),
    });
    revalidatePath('/admin/plans');
    revalidatePath('/dashboard/subscription');
    revalidatePath('/');
    return { success: true, data: { code } };
  } catch (error) {
    return handleActionError(error);
  }
}
