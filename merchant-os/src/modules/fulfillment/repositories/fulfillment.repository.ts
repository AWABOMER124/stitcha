import prisma from '@/lib/db/prisma';
import type { OrderStatus } from '@prisma/client';

const ACTIVE_STATUSES: OrderStatus[] = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

const orderIncludes = {
  items: true,
  customer: true,
  branch: true,
  statusHistory: { orderBy: { createdAt: 'desc' as const } },
} as const;

export async function findActiveOrders(merchantId: string, branchId?: string) {
  return prisma.order.findMany({
    where: {
      merchantId,
      status: { in: ACTIVE_STATUSES },
      ...(branchId && { branchId }),
    },
    include: orderIncludes,
    orderBy: { createdAt: 'asc' },
  });
}

export async function findOrderById(merchantId: string, id: string) {
  return prisma.order.findFirst({
    where: { id, merchantId },
    include: {
      ...orderIncludes,
      statusHistory: { orderBy: { createdAt: 'asc' as const } },
      delivery: true,
      payment: true,
    },
  });
}

export async function advanceOrderStatus(
  merchantId: string,
  orderId: string,
  status: OrderStatus,
  note?: string,
  changedById?: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId, merchantId },
      data: {
        status,
        ...(status === 'DELIVERED' && { completedAt: new Date() }),
      },
      include: orderIncludes,
    });

    await tx.orderStatusHistory.create({
      data: { orderId, status, note, changedById },
    });

    return order;
  });
}

export async function getTodayFulfillmentStats(merchantId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const where = { merchantId, createdAt: { gte: start, lte: end } };

  const [totalToday, deliveredToday, revenueAgg, activeCount] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { ...where, status: 'DELIVERED' },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { merchantId, status: { in: ACTIVE_STATUSES } },
    }),
  ]);

  const deliveredOrders = await prisma.order.findMany({
    where: { ...where, status: 'DELIVERED', completedAt: { not: null } },
    select: { createdAt: true, completedAt: true },
  });

  let avgPrepTime = 0;
  if (deliveredOrders.length > 0) {
    const totalMs = deliveredOrders.reduce((sum, o) => {
      return sum + (o.completedAt!.getTime() - o.createdAt.getTime());
    }, 0);
    avgPrepTime = Math.round(totalMs / deliveredOrders.length / 60000);
  }

  return {
    totalToday,
    activeOrders: activeCount,
    deliveredToday,
    revenueToday: Number(revenueAgg._sum.total ?? 0),
    avgPrepTime,
  };
}
