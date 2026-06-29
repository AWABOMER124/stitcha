import prisma from '@/lib/db/prisma';
import type { Order, OrderStatus, Prisma, DeliveryMethod, PaymentMethod } from '@prisma/client';
import type { OrderFilterInput } from '../schemas/orders.schemas';

// ============================================================================
// Orders Repository — Data access layer
// ============================================================================

const orderIncludes = {
  items: { include: { product: true } },
  statusHistory: { orderBy: { createdAt: 'desc' as const } },
  customer: true,
  delivery: true,
  payment: true,
  branch: true,
};

/** Find an order by ID with all relations */
export async function findById(merchantId: string, id: string) {
  return prisma.order.findFirst({
    where: { id, merchantId },
    include: orderIncludes,
  });
}

/** Find an order by order number */
export async function findByOrderNumber(merchantId: string, orderNumber: string) {
  return prisma.order.findFirst({
    where: { merchantId, orderNumber },
    include: orderIncludes,
  });
}

/** Find all orders with pagination and filters */
export async function findAll(merchantId: string, filters: OrderFilterInput) {
  const { page = 1, limit = 20, status, dateFrom, dateTo, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    merchantId,
    ...(status && { status }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { customerName: { contains: search, mode: 'insensitive' as const } },
        { customerPhone: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        items: true,
        customer: true,
        delivery: true,
        payment: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Create a full order with items, delivery, payment, and status history */
export async function create(
  merchantId: string,
  data: {
    orderNumber: string;
    customerId: string;
    branchId?: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryMethod: string;
    paymentMethod: string;
    notes?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: {
      productId: string;
      productSnapshot: object;
      quantity: number;
      unitPrice: number;
      total: number;
      modifiers?: object;
      notes?: string;
    }[];
  }
) {
  return prisma.order.create({
    data: {
      merchantId,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      branchId: data.branchId,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      discount: 0,
      tax: 0,
      total: data.total,
      deliveryMethod: data.deliveryMethod as Prisma.EnumDeliveryMethodFieldUpdateOperationsInput['set'],
      paymentMethod: data.paymentMethod as Prisma.EnumPaymentMethodFieldUpdateOperationsInput['set'],
      notes: data.notes,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          productSnapshot: item.productSnapshot as Prisma.InputJsonValue,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          modifiers: item.modifiers as Prisma.InputJsonValue ?? undefined,
          notes: item.notes,
        })),
      },
      statusHistory: {
        create: {
          status: 'NEW',
          note: 'Order created',
        },
      },
      delivery: {
        create: {
          type: data.deliveryMethod as DeliveryMethod,
          address: data.customerAddress,
          fee: data.deliveryFee,
        },
      },
      payment: {
        create: {
          method: data.paymentMethod as PaymentMethod,
          amount: data.total,
        },
      },
    },
    include: orderIncludes,
  });
}

/** Update order status and add history entry */
export async function updateStatus(
  merchantId: string,
  id: string,
  status: OrderStatus,
  note?: string,
  changedById?: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id, merchantId },
      data: {
        status,
        ...(status === 'DELIVERED' && { completedAt: new Date() }),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        status,
        note,
        changedById,
      },
    });

    return order;
  });
}

/** Count orders with optional filters */
export async function count(merchantId: string, filters?: Partial<OrderFilterInput>): Promise<number> {
  const where: Prisma.OrderWhereInput = {
    merchantId,
    ...(filters?.status && { status: filters.status }),
  };
  return prisma.order.count({ where });
}

/** Get today's order statistics */
export async function getTodayStats(merchantId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const where: Prisma.OrderWhereInput = {
    merchantId,
    createdAt: { gte: startOfDay, lte: endOfDay },
  };

  const [totalOrders, revenue, pending] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where: { ...where, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { ...where, status: { in: ['NEW', 'ACCEPTED', 'PREPARING'] } },
    }),
  ]);

  return {
    totalOrders,
    revenue: revenue._sum.total ?? 0,
    pendingOrders: pending,
  };
}
