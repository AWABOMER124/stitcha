import prisma from '@/lib/db/prisma';
import type { UpdateMerchantSettingsInput, UpdateStorefrontSettingsInput } from '../schemas/settings.schemas';
import { serializePrismaObject } from '@/lib/serialization';

/** Settings repository — merchant and storefront configuration */

export async function getMerchantSettings(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true, name: true, slug: true, description: true,
      phone: true, email: true, address: true,
      businessType: true, currency: true, timezone: true,
      logo: true, coverImage: true,
    },
  });
  return serializePrismaObject(merchant);
}

export async function updateMerchantSettings(merchantId: string, data: UpdateMerchantSettingsInput) {
  const merchant = await prisma.merchant.update({ where: { id: merchantId }, data });
  return serializePrismaObject(merchant);
}

export async function getStorefrontSettings(merchantId: string) {
  const settings = await prisma.storefrontSettings.findUnique({ where: { merchantId } });
  return serializePrismaObject(settings);
}

export async function updateStorefrontSettings(merchantId: string, data: UpdateStorefrontSettingsInput) {
  const settings = await prisma.storefrontSettings.upsert({
    where: { merchantId },
    update: data,
    create: { merchantId, ...data },
  });
  return serializePrismaObject(settings);
}
