import { dispatchShipmentToPartner } from '@/modules/delivery-partners/services/partner-integration.service';
import type { OutboxHandlers } from './outbox.service';

export const DELIVERY_DISPATCH_TOPIC = 'delivery.partner.dispatch';
export const deliveryPartnerJobHandlers: OutboxHandlers = new Map([
  [DELIVERY_DISPATCH_TOPIC, async (payload: unknown) => {
    if (!payload || typeof payload !== 'object' || !('shipmentId' in payload) || typeof payload.shipmentId !== 'string') throw new Error('Invalid shipment job');
    await dispatchShipmentToPartner(payload.shipmentId);
  }],
]);
