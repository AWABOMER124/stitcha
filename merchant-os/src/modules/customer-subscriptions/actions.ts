'use server';

import * as service from './services/customer-subscriptions.service';
import { grantSubscriptionSchema } from './schemas/customer-subscriptions.schemas';
import type { ActionResult } from '@/lib/types';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

export async function listCustomerSubscriptionsAction(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    return { success: true, data: await service.listSubscriptions() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function grantCustomerSubscriptionAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const userId = (await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE)).id;
    const parsed = grantSubscriptionSchema.parse(input);
    return { success: true, data: await service.grantSubscription(userId, parsed) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function cancelCustomerSubscriptionAction(id: string): Promise<ActionResult<null>> {
  try {
    await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
    await service.cancelSubscription(id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
