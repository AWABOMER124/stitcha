import prisma from '@/lib/db/prisma';

/** Partner ID must come from the authenticated company membership, never the form. */
export async function updatePartnerCodSupport(partnerId: string, supportsCod: boolean) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${partnerId} FOR UPDATE`;
    const partner = await tx.deliveryPartner.update({ where: { id: partnerId }, data: { supportsCod }, select: { id: true, supportsCod: true } });
    if (!supportsCod) await tx.deliveryQuote.updateMany({
      where: { partnerId, status: 'OFFERED', order: { paymentMethod: 'CASH' } }, data: { status: 'CANCELLED' },
    });
    return partner;
  });
}
