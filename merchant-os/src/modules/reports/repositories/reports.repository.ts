import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Reports repository — read-only analytics queries, always tenant-scoped.
 */

export async function getSalesOverview(
  merchantId: string,
  dateRange: { from: Date; to: Date }
) {
  const result = await prisma.order.aggregate({
    where: {
      merchantId,
      createdAt: { gte: dateRange.from, lte: dateRange.to },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    _sum: { total: true },
    _count: true,
    _avg: { total: true },
  });

  return {
    totalSales: Number(result._sum.total ?? 0),
    orderCount: result._count,
    avgOrderValue: Number(result._avg.total ?? 0),
  };
}

export async function getTopProducts(
  merchantId: string,
  dateRange: { from: Date; to: Date },
  limit = 10
) {
  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        merchantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
    },
    _sum: { quantity: true, total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  // Fetch product names
  const productIds = items.map((i) => i.productId).filter(Boolean) as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return items.map((item) => ({
    productId: item.productId,
    productName: productMap.get(item.productId ?? '') ?? 'Deleted Product',
    totalQuantity: item._sum.quantity ?? 0,
    totalRevenue: Number(item._sum.total ?? 0),
    orderCount: item._count,
  }));
}

export async function getOrdersByStatus(
  merchantId: string,
  dateRange: { from: Date; to: Date }
) {
  const results = await prisma.order.groupBy({
    by: ['status'],
    where: {
      merchantId,
      createdAt: { gte: dateRange.from, lte: dateRange.to },
    },
    _count: true,
  });

  return results.map((r) => ({ status: r.status, count: r._count }));
}

export async function getSalesByDay(merchantId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      merchantId,
      createdAt: { gte: startDate },
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    },
    select: { createdAt: true, total: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dailyMap = new Map<string, number>();
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(order.total));
  }

  return Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }));
}

export async function getLowStockProducts(merchantId: string) {
  return prisma.inventoryItem.findMany({
    where: {
      merchantId,
      quantity: { lte: prisma.inventoryItem.fields.lowStockThreshold as unknown as number },
    },
    include: { product: { select: { id: true, name: true, slug: true } } },
    orderBy: { quantity: 'asc' },
  });
}
