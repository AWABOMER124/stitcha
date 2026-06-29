import prisma from '@/lib/db/prisma';
import type { DeliveryStatus } from '@prisma/client';

// ============================================================================
// Delivery Repository — Data access layer
// ============================================================================

const deliveryIncludes = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      merchantId: true,
      customerName: true,
      customerPhone: true,
      status: true,
    },
  },
};

/** Find delivery by order ID */
export async function findByOrder(orderId: string) {
  return prisma.delivery.findUnique({
    where: { orderId },
    include: deliveryIncludes,
  });
}

/** Find all deliveries for a merchant (via order join) */
export async function findAll(merchantId: string) {
  return prisma.delivery.findMany({
    where: {
      order: { merchantId },
    },
    include: deliveryIncludes,
    orderBy: { createdAt: 'desc' },
  });
}

/** Create a delivery record */
export async function create(data: {
  orderId: string;
  type: string;
  address?: string;
  area?: string;
  city?: string;
  fee?: number;
}) {
  return prisma.delivery.create({
    data: {
      orderId: data.orderId,
      type: data.type as DeliveryStatus extends string ? never : any,
      address: data.address,
      area: data.area,
      city: data.city,
      fee: data.fee ?? 0,
    },
    include: deliveryIncludes,
  });
}

/** Update delivery status */
export async function updateStatus(id: string, status: DeliveryStatus, notes?: string) {
  return prisma.delivery.update({
    where: { id },
    data: {
      status,
      notes,
      ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
    },
    include: deliveryIncludes,
  });
}

/** Assign a driver to a delivery */
export async function assignDriver(id: string, driverName: string, driverPhone: string) {
  return prisma.delivery.update({
    where: { id },
    data: {
      driverName,
      driverPhone,
      status: 'ASSIGNED',
    },
    include: deliveryIncludes,
  });
}
