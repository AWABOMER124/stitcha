'use server';

import { updateMerchantSettingsSchema, updateStorefrontSettingsSchema } from './schemas/settings.schemas';
import * as settingsService from './services/settings.service';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function getMerchantSettingsAction(merchantId: string): Promise<ActionResult<unknown>> {
  try {
    const data = await settingsService.getMerchantSettings(merchantId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updateMerchantSettingsAction(merchantId: string, input: unknown): Promise<ActionResult<unknown>> {
  try {
    const data = updateMerchantSettingsSchema.parse(input);
    const result = await settingsService.updateMerchantSettings(merchantId, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updateStorefrontSettingsAction(merchantId: string, input: unknown): Promise<ActionResult<unknown>> {
  try {
    const data = updateStorefrontSettingsSchema.parse(input);
    const result = await settingsService.updateStorefrontSettings(merchantId, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}
