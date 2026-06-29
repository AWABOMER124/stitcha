'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as ordersService from './services/orders.service';
import { createOrderSchema, updateOrderStatusSchema, orderFilterSchema } from './schemas/orders.schemas';
import type { ActionResult, PaginatedResult } from '@/lib/types';
import type { Order, OrderStatus } from '@prisma/client';

// ============================================================================
// Orders Module — Server Actions
// ============================================================================

/** List orders with filters and pagination */
export async function getOrdersAction(filters: unknown): Promise<ActionResult<PaginatedResult<Order>>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const parsed = orderFilterSchema.parse(filters);
    const result = await ordersService.getOrders(auth.merchantId, parsed);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get orders' };
  }
}

/** Get a single order by ID */
export async function getOrderAction(id: string): Promise<ActionResult<Order>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const order = await ordersService.getOrder(auth.merchantId, id);
    return { success: true, data: order as Order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get order' };
  }
}

/** Create a new order */
export async function createOrderAction(formData: unknown): Promise<ActionResult<Order>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:create');
    const parsed = createOrderSchema.parse(formData);
    const order = await ordersService.createOrder(auth.merchantId, parsed);
    return { success: true, data: order as Order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create order' };
  }
}

/** Update order status */
export async function updateOrderStatusAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Order>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:update');
    const parsed = updateOrderStatusSchema.parse(formData);
    const order = await ordersService.updateOrderStatus(
      auth.merchantId,
      id,
      parsed.status as OrderStatus,
      parsed.note,
      auth.userId
    );
    return { success: true, data: order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update order status' };
  }
}

/** Get today's order overview */
export async function getTodayOverviewAction(): Promise<ActionResult<{ totalOrders: number; revenue: unknown; pendingOrders: number }>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const overview = await ordersService.getTodayOverview(auth.merchantId);
    return { success: true, data: overview };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get today overview' };
  }
}
