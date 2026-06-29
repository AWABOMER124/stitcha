'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as fulfillmentService from './services/fulfillment.service';
import { advanceOrderStatusSchema } from './schemas/fulfillment.schemas';
import type { ActionResult } from '@/lib/types';
import type { ActiveOrder, FulfillmentStats } from './types';
import type { OrderStatus } from '@prisma/client';

export async function getActiveOrdersAction(): Promise<ActionResult<ActiveOrder[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const orders = await fulfillmentService.getActiveOrders(auth.merchantId);
    return { success: true, data: orders as ActiveOrder[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل تحميل الطلبات' };
  }
}

export async function getOrderDetailAction(id: string): Promise<ActionResult<ActiveOrder>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const order = await fulfillmentService.getOrderDetail(auth.merchantId, id);
    return { success: true, data: order as unknown as ActiveOrder };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل تحميل الطلب' };
  }
}

export async function advanceOrderStatusAction(
  orderId: string,
  formData: unknown,
): Promise<ActionResult<ActiveOrder>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:update');
    const parsed = advanceOrderStatusSchema.parse(formData);
    const order = await fulfillmentService.advanceStatus(
      auth.merchantId,
      orderId,
      parsed.status as OrderStatus,
      parsed.note,
      auth.userId,
    );
    return { success: true, data: order as unknown as ActiveOrder };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل تحديث حالة الطلب' };
  }
}

export async function getFulfillmentStatsAction(): Promise<ActionResult<FulfillmentStats>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'orders:read');
    const stats = await fulfillmentService.getTodayStats(auth.merchantId);
    return { success: true, data: { ...stats, delayedCount: 0 } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل تحميل الإحصائيات' };
  }
}
