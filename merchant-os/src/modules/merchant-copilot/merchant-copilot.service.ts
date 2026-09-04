import prisma from '@/lib/db/prisma';

export async function buildMerchantCopilotSnapshot(merchantId: string, now = new Date()) {
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const delayedBefore = new Date(now.getTime() - 24 * 60 * 60_000);
  const [merchant, statuses, deliveredItems, inventory, delayedOrders] = await Promise.all([
    prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { name: true, currency: true } }),
    prisma.order.groupBy({
      by: ['status'], where: { merchantId, createdAt: { gte: from, lte: now } },
      _count: { id: true }, _sum: { total: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { merchantId, status: 'DELIVERED', createdAt: { gte: from, lte: now } } },
      select: { quantity: true, total: true, productSnapshot: true }, take: 2_000,
    }),
    prisma.inventoryItem.findMany({
      where: { merchantId }, select: { quantity: true, lowStockThreshold: true, product: { select: { name: true } } }, take: 500,
    }),
    prisma.order.count({ where: { merchantId, status: { in: ['NEW', 'ACCEPTED', 'PREPARING'] }, createdAt: { lt: delayedBefore } } }),
  ]);

  const topProducts = new Map<string, { quantity: number; revenue: number }>();
  for (const item of deliveredItems) {
    const product = item.productSnapshot as { name?: string } | null;
    const name = product?.name?.slice(0, 120) || 'منتج غير مسمى';
    const current = topProducts.get(name) ?? { quantity: 0, revenue: 0 };
    current.quantity += item.quantity;
    current.revenue += Number(item.total);
    topProducts.set(name, current);
  }
  const lowStock = inventory.filter((item) => item.quantity <= item.lowStockThreshold).slice(0, 20);
  return {
    period: { from: from.toISOString(), to: now.toISOString(), timezone: 'Africa/Khartoum' },
    merchant: { name: merchant.name, currency: merchant.currency },
    orders: statuses.map((item) => ({ status: item.status, count: item._count.id, total: Number(item._sum.total ?? 0) })),
    delayedOrdersOver24h: delayedOrders,
    topProducts: [...topProducts.entries()].map(([name, values]) => ({ name, ...values })).sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    inventory: { trackedItems: inventory.length, lowStockCount: lowStock.length, lowStockProducts: lowStock.map((item) => ({ name: item.product.name, quantity: item.quantity, threshold: item.lowStockThreshold })) },
  };
}
