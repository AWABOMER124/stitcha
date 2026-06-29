import * as repo from '../repositories/fulfillment.repository';
import { STATUS_TRANSITIONS, TERMINAL_STATUSES } from '../types';
import type { OrderStatus } from '@prisma/client';

export async function getActiveOrders(merchantId: string, branchId?: string) {
  return repo.findActiveOrders(merchantId, branchId);
}

export async function getOrderDetail(merchantId: string, id: string) {
  const order = await repo.findOrderById(merchantId, id);
  if (!order) throw new Error('الطلب غير موجود');
  return order;
}

export async function advanceStatus(
  merchantId: string,
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
  changedById?: string,
) {
  const order = await repo.findOrderById(merchantId, orderId);
  if (!order) throw new Error('الطلب غير موجود');

  const current = order.status as OrderStatus;
  if (TERMINAL_STATUSES.includes(current)) {
    throw new Error('لا يمكن تغيير حالة الطلب المكتمل أو الملغي');
  }

  const allowed = STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`لا يمكن الانتقال من ${current} إلى ${newStatus}`);
  }

  return repo.advanceOrderStatus(merchantId, orderId, newStatus, note, changedById);
}

export async function getTodayStats(merchantId: string) {
  return repo.getTodayFulfillmentStats(merchantId);
}
