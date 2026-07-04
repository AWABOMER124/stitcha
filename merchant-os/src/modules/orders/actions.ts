'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as ordersService from './services/orders.service';
import { createOrderSchema, updateOrderStatusSchema, orderFilterSchema } from './schemas/orders.schemas';
import type { ActionResult, PaginatedResult } from '@/lib/types';
import type { Order, OrderStatus } from '@prisma/client';
import type { DistributorOrderTab } from './repositories/orders.repository';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

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

// ============================================================================
// Distributor-wide order registry — across every merchant the distributor owns
// ============================================================================

export async function getDistributorOrdersAction(
  tab: DistributorOrderTab,
  search?: string,
  page = 1,
  limit = 20,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await ordersService.getOrdersForDistributor(distributorId, { tab, search, page, limit });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get orders' };
  }
}

export async function assignOrderDeliveryCompanyAction(
  orderId: string,
  deliveryCompanyId: string | null,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await ordersService.assignOrderDeliveryCompany(distributorId, orderId, deliveryCompanyId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign delivery company' };
  }
}
