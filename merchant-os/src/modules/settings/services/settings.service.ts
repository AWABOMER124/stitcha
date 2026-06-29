import { NotFoundError } from '@/lib/errors';
import * as settingsRepo from '../repositories/settings.repository';
import type { UpdateMerchantSettingsInput, UpdateStorefrontSettingsInput } from '../schemas/settings.schemas';

/** Settings service — merchant and storefront configuration */

export async function getMerchantSettings(merchantId: string) {
  const settings = await settingsRepo.getMerchantSettings(merchantId);
  if (!settings) throw new NotFoundError('Merchant');
  return settings;
}

export async function updateMerchantSettings(merchantId: string, data: UpdateMerchantSettingsInput) {
  return settingsRepo.updateMerchantSettings(merchantId, data);
}

export async function getStorefrontSettings(merchantId: string) {
  return settingsRepo.getStorefrontSettings(merchantId);
}

export async function updateStorefrontSettings(merchantId: string, data: UpdateStorefrontSettingsInput) {
  return settingsRepo.updateStorefrontSettings(merchantId, data);
}
