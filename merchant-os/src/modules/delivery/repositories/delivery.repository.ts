import prisma from '@/lib/db/prisma';
import type { DeliveryStatus } from '@prisma/client';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

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

/** Find delivery by order ID, scoped to the owning merchant */
export async function findByOrder(merchantId: string, orderId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { orderId, order: { merchantId } },
    include: deliveryIncludes,
  });
  return serializePrismaObject(delivery);
}

/** Find all deliveries for a merchant (via order join) */
export async function findAll(merchantId: string) {
  const deliveries = await prisma.delivery.findMany({
    where: {
      order: { merchantId },
    },
    include: deliveryIncludes,
    orderBy: { createdAt: 'desc' },
  });
  return serializePrismaArray(deliveries);
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
  const delivery = await prisma.delivery.create({
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
  return serializePrismaObject(delivery);
}

/** Update delivery status — scoped through the order's merchantId (Delivery has no merchantId of its own) */
export async function updateStatus(merchantId: string, id: string, status: DeliveryStatus, notes?: string) {
  const result = await prisma.delivery.updateMany({
    where: { id, order: { merchantId } },
    data: {
      status,
      notes,
      ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
    },
  });
  if (result.count === 0) throw new Error('Delivery not found');
  const delivery = await prisma.delivery.findUnique({ where: { id }, include: deliveryIncludes });
  return serializePrismaObject(delivery);
}

/** Assign a driver to a delivery — scoped through the order's merchantId */
export async function assignDriver(merchantId: string, id: string, driverName: string, driverPhone: string) {
  const result = await prisma.delivery.updateMany({
    where: { id, order: { merchantId } },
    data: {
      driverName,
      driverPhone,
      status: 'ASSIGNED',
    },
  });
  if (result.count === 0) throw new Error('Delivery not found');
  const delivery = await prisma.delivery.findUnique({ where: { id }, include: deliveryIncludes });
  return serializePrismaObject(delivery);
}
