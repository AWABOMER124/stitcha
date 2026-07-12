import prisma from '@/lib/db/prisma';

// ============================================================================
// WhatsApp Channel Repository — Data access layer
// Access tokens are stored/read as opaque encrypted strings here; encryption
// and decryption happen in the service layer, never in the repository.
// ============================================================================

export async function findByMerchant(merchantId: string) {
  return prisma.whatsAppConfig.findUnique({ where: { merchantId } });
}

/** Used only by the inbound webhook route to route a message to its owning merchant. */
export async function findByPhoneNumberId(phoneNumberId: string) {
  return prisma.whatsAppConfig.findUnique({ where: { phoneNumberId } });
}

export async function upsert(
  merchantId: string,
  data: { phoneNumberId: string; wabaId?: string; displayPhone?: string; encryptedAccessToken: string }
) {
  return prisma.whatsAppConfig.upsert({
    where: { merchantId },
    create: {
      merchantId,
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
      displayPhone: data.displayPhone,
      accessToken: data.encryptedAccessToken,
      isActive: true,
    },
    update: {
      phoneNumberId: data.phoneNumberId,
      wabaId: data.wabaId,
      displayPhone: data.displayPhone,
      accessToken: data.encryptedAccessToken,
      isActive: true,
    },
  });
}

export async function deactivate(merchantId: string) {
  return prisma.whatsAppConfig.updateMany({
    where: { merchantId },
    data: { isActive: false },
  });
}
