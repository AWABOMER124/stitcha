'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { updateMerchantSettingsSchema, updateStorefrontSettingsSchema } from './schemas/settings.schemas';
import * as settingsService from './services/settings.service';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// merchantId is intentionally NOT accepted as a parameter here — it's
// resolved from the caller's own session so one merchant can never read or
// write another merchant's settings by passing an arbitrary ID.
async function getMerchantId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  return session.user.merchantId;
}

export async function getMerchantSettingsAction(): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await settingsService.getMerchantSettings(merchantId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getStorefrontSettingsAction(): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await settingsService.getStorefrontSettings(merchantId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updateMerchantSettingsAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = updateMerchantSettingsSchema.parse(input);
    const result = await settingsService.updateMerchantSettings(merchantId, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updateStorefrontSettingsAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = updateStorefrontSettingsSchema.parse(input);
    const result = await settingsService.updateStorefrontSettings(merchantId, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}
