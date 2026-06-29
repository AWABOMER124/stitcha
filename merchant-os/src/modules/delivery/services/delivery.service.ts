import { NotFoundError } from '@/lib/errors';
import * as deliveryRepo from '../repositories/delivery.repository';
import type { DeliveryStatus } from '@prisma/client';

// ============================================================================
// Delivery Service — Business logic
// ============================================================================

/** Get delivery details for an order */
export async function getDelivery(orderId: string) {
  const delivery = await deliveryRepo.findByOrder(orderId);
  if (!delivery) throw new NotFoundError('Delivery');
  return delivery;
}

/** Get all active deliveries for a merchant */
export async function getDeliveries(merchantId: string) {
  const all = await deliveryRepo.findAll(merchantId);
  return all.filter((d) => d.status !== 'DELIVERED' && d.status !== 'FAILED');
}

/** Update delivery status */
export async function updateDeliveryStatus(id: string, status: string, notes?: string) {
  return deliveryRepo.updateStatus(id, status as DeliveryStatus, notes);
}

/** Assign a driver to a delivery */
export async function assignDriver(id: string, driverName: string, driverPhone: string) {
  return deliveryRepo.assignDriver(id, driverName, driverPhone);
}
