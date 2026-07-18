'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as distributorSettingsService from './services/distributor-settings.service';
import { updateDistributorSettingsSchema } from './schemas/distributor-settings.schemas';
import type { ActionResult } from '@/lib/types';

// merchantId-style guard, mirrored for distributors: never accept
// distributorId as a client parameter, always resolve it from the session.
async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

export async function getDistributorSettingsAction(): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await distributorSettingsService.getSettings(distributorId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get settings' };
  }
}

export async function updateDistributorSettingsAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = updateDistributorSettingsSchema.parse(input);
    const data = await distributorSettingsService.updateSettings(distributorId, parsed);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' };
  }
}
