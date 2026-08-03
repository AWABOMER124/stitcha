'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as service from './services/customer-subscriptions.service';
import { grantSubscriptionSchema } from './schemas/customer-subscriptions.schemas';
import type { ActionResult } from '@/lib/types';

async function assertPlatformOwner(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'PLATFORM_OWNER') redirect('/dashboard');
  return session.user.id;
}

export async function listCustomerSubscriptionsAction(): Promise<ActionResult<unknown[]>> {
  try {
    await assertPlatformOwner();
    return { success: true, data: await service.listSubscriptions() };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function grantCustomerSubscriptionAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const userId = await assertPlatformOwner();
    const parsed = grantSubscriptionSchema.parse(input);
    return { success: true, data: await service.grantSubscription(userId, parsed) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function cancelCustomerSubscriptionAction(id: string): Promise<ActionResult<null>> {
  try {
    await assertPlatformOwner();
    await service.cancelSubscription(id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
