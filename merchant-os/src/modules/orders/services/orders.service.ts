import prisma from '@/lib/db/prisma';
import { NotFoundError, BusinessRuleError, ValidationError } from '@/lib/errors';
import * as ordersRepo from '../repositories/orders.repository';
import * as inventoryService from '@/modules/inventory/services/inventory.service';
import * as customerSubscriptionsService from '@/modules/customer-subscriptions/services/customer-subscriptions.service';
import * as driversService from '@/modules/drivers/services/drivers.service';
import type { CreateOrderInput, OrderFilterInput } from '../schemas/orders.schemas';
import type { OrderStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

// Terminal statuses where stock committed at order creation should return to inventory.
const STOCK_RESTORING_STATUSES: OrderStatus[] = ['CANCELLED', 'REJECTED'];

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

  let deliveryFee = 0;
  if (data.deliveryMethod !== 'PICKUP') {
    const merchantRecord = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { distributorId: true },
    });
    if (merchantRecord?.distributorId) {
      const zone = await prisma.deliveryZone.findFirst({
        where: { distributorId: merchantRecord.distributorId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (zone) deliveryFee = Number(zone.baseFee);
    }

    // Waive it for a customer with an active delivery-perk subscription (see
    // customer-subscriptions module). Only meaningful once a customer's
    // per-merchant Customer record is linked to their app CustomerAccount —
    // walk-in customers with no app account never have anything to waive.
    if (deliveryFee > 0) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { accountId: true } });
      if (customer?.accountId && (await customerSubscriptionsService.hasActiveDeliveryPerk(customer.accountId))) {
        deliveryFee = 0;
      }
    }
  }
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

  // Best-effort — inventory tracking is a side-effect of the order, not part
  // of the checkout contract; a merchant with no inventory configured (or a
  // transient failure here) shouldn't block the order itself.
  try {
    await inventoryService.deductForOrder(
      merchantId,
      data.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );
  } catch (err) {
    console.error('[orders] Failed to deduct inventory for order', order.orderNumber, err);
  }

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

  const updated = await ordersRepo.updateStatus(merchantId, id, newStatus, note, userId);

  // Hybrid driver assignment: automation's first attempt is the nearest
  // available driver; if that fails (no location data, nobody online), the
  // order is simply left for a human to assign manually from the dispatch
  // board. Only meaningful for the platform's own delivery fleet — a
  // merchant handling its own delivery or an external company has no Driver
  // records to assign.
  if (newStatus === 'READY' && order.deliveryMethod === 'WASLAK_DELIVERY') {
    try {
      const merchantRecord = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { distributorId: true } });
      if (merchantRecord?.distributorId) {
        await driversService.autoAssignNearestDriver(merchantRecord.distributorId, id);
      }
    } catch (err) {
      console.error('[orders] Auto-assign nearest driver failed for order', order.orderNumber, err);
    }
  }

  if (STOCK_RESTORING_STATUSES.includes(newStatus)) {
    // Best-effort, same reasoning as the deduction side in createOrder().
    try {
      const items = (order as { items?: { productId: string; quantity: number }[] }).items ?? [];
      await inventoryService.restoreForCancellation(
        merchantId,
        items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      );
    } catch (err) {
      console.error('[orders] Failed to restore inventory for order', order.orderNumber, err);
    }
  }

  return updated;
}

/** Get today's order overview stats */
export async function getTodayOverview(merchantId: string) {
  return ordersRepo.getTodayStats(merchantId);
}

/** Orders across every merchant owned by a distributor */
export async function getOrdersForDistributor(
  distributorId: string,
  filters: { tab: ordersRepo.DistributorOrderTab; search?: string; page?: number; limit?: number },
) {
  return ordersRepo.findAllForDistributor(distributorId, filters);
}

/** Assign (or clear) the external delivery company handling an order */
export async function assignOrderDeliveryCompany(distributorId: string, orderId: string, deliveryCompanyId: string | null) {
  return ordersRepo.assignOrderDeliveryCompany(distributorId, orderId, deliveryCompanyId);
}
