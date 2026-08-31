import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import type { OrderStatus, PlatformShipmentStatus } from '@prisma/client';

export const shipmentTransitions: Partial<Record<PlatformShipmentStatus, PlatformShipmentStatus[]>> = {
  REQUESTED: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'], IN_TRANSIT: ['DELIVERED', 'FAILED'],
};
const rank: Partial<Record<PlatformShipmentStatus, number>> = { REQUESTED: 0, ASSIGNED: 1, PICKED_UP: 2, IN_TRANSIT: 3, DELIVERED: 4 };

/** Atomic order/shipment transitions; serialized duplicates and late events are no-ops. */
export async function applyShipmentState(input: {
  partnerId: string; shipmentId: string; status: PlatformShipmentStatus;
  actorType: 'PARTNER_API' | 'DELIVERY_PARTNER'; actorId?: string; note?: string;
}) {
  return prisma.$transaction(async tx => {
    const initial = await tx.platformShipment.findFirst({ where: { id: input.shipmentId, partnerId: input.partnerId } });
    if (!initial) throw new NotFoundError('Shipment not found');
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${initial.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${input.partnerId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM platform_shipments WHERE id = ${initial.id} FOR UPDATE`;
    const partner = await tx.deliveryPartner.findUniqueOrThrow({ where: { id: input.partnerId } });
    if (!partner.isActive || partner.status !== 'ACTIVE') throw new BusinessRuleError('Partner is not active');
    const shipment = await tx.platformShipment.findUniqueOrThrow({ where: { id: initial.id }, include: { order: true } });
    if (shipment.status === input.status) return { applied: false, reason: 'duplicate' };
    if (rank[shipment.status] != null && rank[input.status] != null && rank[input.status]! < rank[shipment.status]!) return { applied: false, reason: 'outdated' };
    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(shipment.status)) throw new BusinessRuleError('Shipment is terminal');
    const valid = input.actorType === 'PARTNER_API'
      ? (rank[input.status] != null && rank[input.status]! > (rank[shipment.status] ?? -1)) || shipmentTransitions[shipment.status]?.includes(input.status)
      : shipmentTransitions[shipment.status]?.includes(input.status);
    if (!valid) throw new BusinessRuleError('Invalid shipment transition');
    let orderStatus: OrderStatus | undefined;
    if (['PICKED_UP', 'IN_TRANSIT'].includes(input.status)) {
      if (!['READY', 'OUT_FOR_DELIVERY'].includes(shipment.order.status)) throw new BusinessRuleError('Order is not ready for handoff');
      if (shipment.order.status === 'READY') orderStatus = 'OUT_FOR_DELIVERY';
    }
    if (input.status === 'DELIVERED') {
      if (!['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment.order.status)) throw new BusinessRuleError('Order cannot be delivered');
      if (shipment.order.status !== 'DELIVERED') orderStatus = 'DELIVERED';
    }
    if (['CANCELLED', 'REJECTED'].includes(shipment.order.status) && input.status !== 'CANCELLED') throw new BusinessRuleError('Order is cancelled');
    const now = new Date();
    await tx.platformShipment.update({ where: { id: shipment.id }, data: {
      status: input.status, ...(input.status === 'ASSIGNED' ? { assignedAt: now } : {}),
      ...(input.status === 'PICKED_UP' ? { pickedUpAt: now } : {}), ...(input.status === 'DELIVERED' ? { deliveredAt: now } : {}),
      events: { create: { status: input.status, actorType: input.actorType, actorId: input.actorId, note: input.note?.slice(0, 1000) } },
    } });
    if (orderStatus) {
      await tx.order.update({ where: { id: shipment.orderId }, data: { status: orderStatus, ...(orderStatus === 'DELIVERED' ? { completedAt: now } : {}) } });
      await tx.orderStatusHistory.create({ data: { orderId: shipment.orderId, status: orderStatus, note: input.note ?? `Delivery partner: ${input.status}`, changedById: input.actorId } });
    }
    return { applied: true };
  });
}
