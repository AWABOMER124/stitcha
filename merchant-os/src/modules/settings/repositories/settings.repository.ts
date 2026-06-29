import prisma from '@/lib/db/prisma';
import type { UpdateMerchantSettingsInput, UpdateStorefrontSettingsInput } from '../schemas/settings.schemas';

/** Settings repository — merchant and storefront configuration */

export async function getMerchantSettings(merchantId: string) {
  return prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true, name: true, slug: true, description: true,
      phone: true, email: true, address: true,
      businessType: true, currency: true, timezone: true,
      logo: true, coverImage: true,
    },
  });
}

export async function updateMerchantSettings(merchantId: string, data: UpdateMerchantSettingsInput) {
  return prisma.merchant.update({ where: { id: merchantId }, data });
}

export async function getStorefrontSettings(merchantId: string) {
  return prisma.storefrontSettings.findUnique({ where: { merchantId } });
}

export async function updateStorefrontSettings(merchantId: string, data: UpdateStorefrontSettingsInput) {
  return prisma.storefrontSettings.upsert({
    where: { merchantId },
    update: data,
    create: { merchantId, ...data },
  });
}
