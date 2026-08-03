import prisma from '@/lib/db/prisma';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';
import { serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Payments Repository — Data access layer
// ============================================================================

/** Find payment by order ID — scoped to the merchant that owns the order */
export async function findByOrder(orderId: string, merchantId: string) {
  const payment = await prisma.payment.findFirst({
    where: { orderId, order: { merchantId } },
  });
  return serializePrismaObject(payment);
}

/** Create a payment record */
export async function create(data: {
  orderId: string;
  method: string;
  amount: number;
  transactionRef?: string;
}) {
  const payment = await prisma.payment.create({
    data: {
      orderId: data.orderId,
      method: data.method as PaymentMethod,
      amount: data.amount,
      transactionRef: data.transactionRef,
    },
  });
  return serializePrismaObject(payment);
}

/** Update payment status — scoped to the merchant that owns the underlying order. Returns null if no matching (id, merchant-owned) payment exists. */
export async function updateStatus(id: string, merchantId: string, status: PaymentStatus, paidAt?: Date) {
  const result = await prisma.payment.updateMany({
    where: { id, order: { merchantId } },
    data: {
      status,
      ...(paidAt && { paidAt }),
    },
  });
  if (result.count === 0) return null;
  const payment = await prisma.payment.findUnique({ where: { id } });
  return serializePrismaObject(payment);
}
