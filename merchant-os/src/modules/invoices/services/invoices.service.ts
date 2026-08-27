import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import type { InvoiceStatus } from '@prisma/client';

function productName(snapshot: unknown): string {
  if (snapshot && typeof snapshot === 'object' && 'name' in snapshot) {
    const name = (snapshot as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return 'منتج';
}

export async function listInvoices(merchantId: string) {
  return prisma.invoice.findMany({
    where: { merchantId },
    include: { order: { select: { orderNumber: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
}

export async function listOrdersWithoutInvoices(merchantId: string) {
  return prisma.order.findMany({
    where: { merchantId, invoice: null, status: { notIn: ['CANCELLED', 'REJECTED'] } },
    select: { id: true, orderNumber: true, customerName: true, total: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getInvoice(merchantId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, merchantId },
    include: { items: true, merchant: true, order: { select: { orderNumber: true, paymentMethod: true } } },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  return invoice;
}

export async function getPublicInvoice(publicToken: string) {
  return prisma.invoice.findUnique({
    where: { publicToken },
    include: { items: true, merchant: true, order: { select: { orderNumber: true, paymentMethod: true } } },
  });
}

export async function createInvoiceFromOrder(merchantId: string, orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { merchantId, orderId } });
    if (existing) return existing;

    const order = await tx.order.findFirst({
      where: { id: orderId, merchantId },
      include: {
        merchant: { select: { currency: true } },
        customer: { select: { email: true } },
        items: { include: { product: { select: { sku: true } } } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    return tx.invoice.create({
      data: {
        merchantId,
        orderId,
        invoiceNumber: `INV-${order.orderNumber}`,
        status: 'ISSUED',
        currency: order.merchant.currency,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customer.email,
        billingAddress: order.customerAddress,
        notes: order.notes,
        issuedAt: new Date(),
        createdById: userId,
        items: {
          create: order.items.map((item) => ({
            orderItemId: item.id,
            description: productName(item.productSnapshot),
            sku: item.product?.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
    });
  });
}

export async function updateInvoiceStatus(merchantId: string, id: string, status: InvoiceStatus) {
  const invoice = await prisma.invoice.findFirst({ where: { id, merchantId } });
  if (!invoice) throw new NotFoundError('Invoice not found');

  const allowed: Record<InvoiceStatus, InvoiceStatus[]> = {
    DRAFT: ['ISSUED', 'VOID'],
    ISSUED: ['PAID', 'VOID'],
    PAID: [],
    VOID: [],
  };
  if (!allowed[invoice.status].includes(status)) {
    throw new BusinessRuleError(`Cannot change invoice from ${invoice.status} to ${status}`);
  }

  await prisma.invoice.updateMany({
    where: { id, merchantId, status: invoice.status },
    data: {
      status,
      ...(status === 'ISSUED' ? { issuedAt: new Date() } : {}),
      ...(status === 'PAID' ? { paidAt: new Date() } : {}),
      ...(status === 'VOID' ? { voidedAt: new Date() } : {}),
    },
  });
  return getInvoice(merchantId, id);
}
