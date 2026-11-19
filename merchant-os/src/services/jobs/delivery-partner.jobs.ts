import { cancelShipmentAtPartner, dispatchShipmentToPartner } from '@/modules/delivery-partners/services/partner-integration.service';
import { dispatchReturnShipment } from '@/modules/delivery-partners/services/return-shipment.service';
import { syncMerchantInstallation } from '@/modules/delivery-partners/services/installation-sync.service';
import type { OutboxHandlers } from './outbox.service';

export const DELIVERY_DISPATCH_TOPIC = 'delivery.partner.dispatch';
export const DELIVERY_CANCEL_TOPIC = 'delivery.partner.cancel';
export const deliveryPartnerJobHandlers: OutboxHandlers = new Map([
  ['delivery.partner.installation.sync', async (payload: unknown, job) => {
    if (!payload || typeof payload !== 'object' || !('installationId' in payload) || typeof payload.installationId !== 'string' || !('version' in payload) || typeof payload.version !== 'number') throw new Error('Invalid installation job');
    await syncMerchantInstallation(payload.installationId,payload.version,job.attempts>=job.maxAttempts);
  }],
  ['delivery.partner.return.dispatch', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object' || !('returnId' in payload) || typeof payload.returnId !== 'string') throw new Error('Invalid return job');
    await dispatchReturnShipment(payload.returnId);
  }],
  [DELIVERY_DISPATCH_TOPIC, async (payload: unknown) => {
    if (!payload || typeof payload !== 'object' || !('shipmentId' in payload) || typeof payload.shipmentId !== 'string') throw new Error('Invalid shipment job');
    await dispatchShipmentToPartner(payload.shipmentId);
  }],
  [DELIVERY_CANCEL_TOPIC, async (payload: unknown) => {
    if (!payload || typeof payload !== 'object' || !('shipmentId' in payload) || typeof payload.shipmentId !== 'string') throw new Error('Invalid shipment cancellation job');
    await cancelShipmentAtPartner(payload.shipmentId);
  }],
]);
