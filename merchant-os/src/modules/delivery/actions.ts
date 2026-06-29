'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as deliveryService from './services/delivery.service';
import { updateDeliveryStatusSchema, assignDriverSchema } from './schemas/delivery.schemas';
import type { ActionResult } from '@/lib/types';
import type { Delivery } from '@prisma/client';

// ============================================================================
// Delivery Module — Server Actions
// ============================================================================

/** Get delivery for a specific order */
export async function getDeliveryAction(orderId: string): Promise<ActionResult<Delivery>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'delivery:read');
    const delivery = await deliveryService.getDelivery(orderId);
    return { success: true, data: delivery as unknown as Delivery };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get delivery' };
  }
}

/** Get all active deliveries */
export async function getDeliveriesAction(): Promise<ActionResult<Delivery[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'delivery:read');
    const deliveries = await deliveryService.getDeliveries(auth.merchantId);
    return { success: true, data: deliveries as unknown as Delivery[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get deliveries' };
  }
}

/** Update delivery status */
export async function updateDeliveryStatusAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Delivery>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'delivery:update');
    const parsed = updateDeliveryStatusSchema.parse(formData);
    const delivery = await deliveryService.updateDeliveryStatus(id, parsed.status, parsed.notes);
    return { success: true, data: delivery as unknown as Delivery };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update delivery status' };
  }
}

/** Assign a driver to a delivery */
export async function assignDriverAction(
  id: string,
  formData: unknown
): Promise<ActionResult<Delivery>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'delivery:update');
    const parsed = assignDriverSchema.parse(formData);
    const delivery = await deliveryService.assignDriver(id, parsed.driverName, parsed.driverPhone);
    return { success: true, data: delivery as unknown as Delivery };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign driver' };
  }
}
