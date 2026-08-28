import prisma from "@/lib/db/prisma";
import {
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from "@/lib/errors";
import * as ordersRepo from "../repositories/orders.repository";
import * as customerSubscriptionsService from "@/modules/customer-subscriptions/services/customer-subscriptions.service";
import * as driversService from "@/modules/drivers/services/drivers.service";
import type {
  CreateOrderInput,
  EditOrderInput,
  OrderFilterInput,
} from "../schemas/orders.schemas";
import type { OrderStatus } from "@prisma/client";
import { nanoid } from "nanoid";

// ============================================================================
// Orders Service — Business logic
// ============================================================================

/**
 * Valid order status transitions.
 * Key = current status, Value = array of valid next statuses.
 */
const VALID_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
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
  if (!order) throw new NotFoundError("Order", id);
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
    throw new ValidationError("Customer is required");
  }

  // Validate and snapshot products
  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, merchantId, isActive: true },
  });

  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    throw new ValidationError(
      `Products not found or inactive: ${missing.join(", ")}`,
    );
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
  if (data.deliveryMethod !== "PICKUP") {
    const merchantRecord = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { distributorId: true },
    });
    if (merchantRecord?.distributorId) {
      const zone = await prisma.deliveryZone.findFirst({
        where: { distributorId: merchantRecord.distributorId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      if (zone) deliveryFee = Number(zone.baseFee);
    }

    // Waive it for a customer with an active delivery-perk subscription (see
    // customer-subscriptions module). Only meaningful once a customer's
    // per-merchant Customer record is linked to their app CustomerAccount —
    // walk-in customers with no app account never have anything to waive.
    if (deliveryFee > 0) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { accountId: true },
      });
      if (
        customer?.accountId &&
        (await customerSubscriptionsService.hasActiveDeliveryPerk(
          customer.accountId,
        ))
      ) {
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
    deliveryLat: data.deliveryLat,
    deliveryLng: data.deliveryLng,
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
  userId?: string,
) {
  const order = await getOrder(merchantId, id);

  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BusinessRuleError(
      `Cannot transition order from "${order.status}" to "${newStatus}". ` +
        `Allowed transitions: ${allowedTransitions.join(", ") || "none (terminal state)"}`,
    );
  }

  if (
    newStatus === "ACCEPTED" &&
    order.paymentMethod === "MANUAL_TRANSFER" &&
    order.payment?.status !== "COMPLETED"
  ) {
    throw new BusinessRuleError(
      "Transfer receipt must be verified before accepting the order",
    );
  }

  const updated = await ordersRepo.updateStatus(
    merchantId,
    id,
    newStatus,
    note,
    userId,
    order.status,
  );

  // Hybrid driver assignment: automation's first attempt is the nearest
  // available driver; if that fails (no location data, nobody online), the
  // order is simply left for a human to assign manually from the dispatch
  // board. Only meaningful for the platform's own delivery fleet — a
  // merchant handling its own delivery or an external company has no Driver
  // records to assign.
  if (newStatus === "READY" && order.deliveryMethod === "WASLAK_DELIVERY") {
    try {
      const merchantRecord = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { distributorId: true },
      });
      if (merchantRecord?.distributorId) {
        await driversService.autoAssignNearestDriver(
          merchantRecord.distributorId,
          id,
        );
      }
    } catch (err) {
      console.error(
        "[orders] Auto-assign nearest driver failed for order",
        order.orderNumber,
        err,
      );
    }
  }

  return updated;
}

/** Edit operational order details before hand-off to a courier. */
export async function editOrder(
  merchantId: string,
  id: string,
  data: EditOrderInput,
  userId?: string,
) {
  const current = await prisma.order.findFirst({
    where: { id, merchantId },
    include: {
      platformShipment: { select: { id: true } },
      payment: { select: { id: true } },
    },
  });
  if (!current) throw new NotFoundError("Order", id);
  if (!["NEW", "ACCEPTED", "PREPARING", "READY"].includes(current.status)) {
    throw new BusinessRuleError(
      "Order can no longer be edited after delivery starts",
    );
  }
  const financialChanged = Number(current.deliveryFee) !== data.deliveryFee;
  if (
    current.platformShipment &&
    (financialChanged || current.customerAddress !== data.customerAddress)
  ) {
    throw new BusinessRuleError(
      "Address and delivery fee cannot change after a delivery shipment is created",
    );
  }
  const total =
    Number(current.subtotal) -
    Number(current.discount) +
    Number(current.tax) +
    data.deliveryFee;
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress || null,
        notes: data.notes || null,
        internalNotes: data.internalNotes || null,
        deliveryFee: data.deliveryFee,
        total,
        delivery: {
          update: {
            address: data.customerAddress || null,
            fee: data.deliveryFee,
          },
        },
        ...(current.payment ? { payment: { update: { amount: total } } } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        status: current.status,
        note: "Order details edited",
        changedById: userId,
      },
    });
  });
  return getOrder(merchantId, id);
}

/** Get today's order overview stats */
export async function getTodayOverview(merchantId: string) {
  return ordersRepo.getTodayStats(merchantId);
}

/** Orders across every merchant owned by a distributor */
export async function getOrdersForDistributor(
  distributorId: string,
  filters: {
    tab: ordersRepo.DistributorOrderTab;
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  return ordersRepo.findAllForDistributor(distributorId, filters);
}

/** Assign (or clear) the external delivery company handling an order */
export async function assignOrderDeliveryCompany(
  distributorId: string,
  orderId: string,
  deliveryCompanyId: string | null,
) {
  return ordersRepo.assignOrderDeliveryCompany(
    distributorId,
    orderId,
    deliveryCompanyId,
  );
}
