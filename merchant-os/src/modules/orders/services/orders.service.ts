import prisma from '@/lib/db/prisma';
import { NotFoundError, BusinessRuleError, ValidationError } from '@/lib/errors';
import * as ordersRepo from '../repositories/orders.repository';
import type { CreateOrderInput, OrderFilterInput } from '../schemas/orders.schemas';
import type { OrderStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

// ============================================================================
// Orders Service — Business logic
// ============================================================================

/**
 * Valid order status transitions.
 * Key = current status, Value = array of valid next statuses.
 */
const VALID_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  // Terminal states — no transitions allowed
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Generate a human-readable order number.
 * Format: ORD-XXXXXXXX (8-char nanoid, uppercase)
 */
function generateOrderNumber(): string {
  return `ORD-${nanoid(8).toUpperCase()}`;
}

/** Get paginated list of orders */
export async function getOrders(merchantId: string, filters: OrderFilterInput) {
  return ordersRepo.findAll(merchantId, filters);
}

/** Get a single order with all relations */
export async function getOrder(merchantId: string, id: string) {
  const order = await ordersRepo.findById(merchantId, id);
  if (!order) throw new NotFoundError('Order', id);
  return order;
}

/**
 * Create a new order.
 * - Validates all products exist and are active
 * - Snapshots product prices at order time
 * - Generates unique order number
 * - Creates order, items, delivery, payment, status history atomically
 */
export async function createOrder(merchantId: string, data: CreateOrderInput) {
  // Resolve customer
  let customerId = data.customerId;

  if (!customerId && data.customerName && data.customerPhone) {
    // Find or create customer
    const existing = await prisma.customer.findFirst({
      where: { merchantId, phone: data.customerPhone },
    });

    if (existing) {
      customerId = existing.id;
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          merchantId,
          name: data.customerName,
          phone: data.customerPhone,
        },
      });
      customerId = newCustomer.id;
    }
  }

  if (!customerId) {
    throw new ValidationError('Customer is required');
  }

  // Validate and snapshot products
  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId, isActive: true },
  });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw new ValidationError(`Products not found or inactive: ${missing.join(', ')}`);
  }

  // Build order items with price snapshots
  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;

  const orderItems = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.price);

    // Calculate modifier price additions
    let modifierTotal = 0;
    if (item.modifiers) {
      modifierTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0);
    }

    const itemTotal = (unitPrice + modifierTotal) * item.quantity;
    subtotal += itemTotal;

    return {
      productId: item.productId,
      productSnapshot: {
        name: product.name,
        price: unitPrice,
        image: (product.images as string[])?.[0] ?? null,
        sku: product.sku,
      },
      quantity: item.quantity,
      unitPrice: unitPrice + modifierTotal,
      total: itemTotal,
      modifiers: item.modifiers,
      notes: item.notes,
    };
  });

  const deliveryFee = data.deliveryMethod === 'PICKUP' ? 0 : 0; // TODO: calculate delivery fee
  const total = subtotal + deliveryFee;

  const order = await ordersRepo.create(merchantId, {
    orderNumber: generateOrderNumber(),
    customerId,
    branchId: data.branchId,
    subtotal,
    deliveryFee,
    total,
    deliveryMethod: data.deliveryMethod,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    items: orderItems,
  });

  return order;
}

/**
 * Update order status with transition validation.
 * @throws BusinessRuleError if transition is invalid
 */
export async function updateOrderStatus(
  merchantId: string,
  id: string,
  newStatus: OrderStatus,
  note?: string,
  userId?: string
) {
  const order = await getOrder(merchantId, id);

  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BusinessRuleError(
      `Cannot transition order from "${order.status}" to "${newStatus}". ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
    );
  }

  return ordersRepo.updateStatus(merchantId, id, newStatus, note, userId);
}

/** Get today's order overview stats */
export async function getTodayOverview(merchantId: string) {
  return ordersRepo.getTodayStats(merchantId);
}
