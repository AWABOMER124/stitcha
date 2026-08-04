import prisma from '@/lib/db/prisma';
import { decryptSecret } from '@/lib/crypto/secret';
import { getAdapter } from '../registry';
import { NotFoundError, ValidationError } from '@/lib/errors';
import * as ordersService from '@/modules/orders/services/orders.service';
import type { CreateShipmentInput, CreateShipmentResult, DeliveryProviderCredentials } from '../types';
import type { OrderStatus } from '@prisma/client';

async function loadCredentials(config: { apiBaseUrl: string | null; credentials: string | null }): Promise<DeliveryProviderCredentials> {
  return {
    apiBaseUrl: config.apiBaseUrl,
    secret: config.credentials ? decryptSecret(config.credentials) : null,
  };
}

async function buildShipmentInput(orderId: string): Promise<CreateShipmentInput> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      merchant: { select: { name: true, phone: true, address: true, currency: true } },
      branch: { select: { name: true, address: true, phone: true, lat: true, lng: true } },
    },
  });

  const pickup = order.branch
    ? {
        name: order.branch.name,
        phone: order.branch.phone ?? order.merchant.phone ?? '',
        address: order.branch.address ?? order.merchant.address ?? '',
        lat: order.branch.lat,
        lng: order.branch.lng,
      }
    : {
        name: order.merchant.name,
        phone: order.merchant.phone ?? '',
        address: order.merchant.address ?? '',
      };

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    pickup,
    dropoff: {
      name: order.customerName ?? '',
      phone: order.customerPhone ?? '',
      address: order.customerAddress ?? '',
    },
    codAmount: Number(order.total),
    currency: order.merchant.currency,
  };
}

/**
 * Creates a shipment with whichever provider is configured for this
 * delivery company. Returns null (rather than throwing) when the company
 * has no active integration — that's the normal case today (manual/phone
 * companies), not an error.
 */
export async function createShipmentForOrder(deliveryCompanyId: string, orderId: string): Promise<CreateShipmentResult | null> {
  const config = await prisma.deliveryProviderConfig.findUnique({ where: { deliveryCompanyId } });
  if (!config || !config.isActive) return null;

  const adapter = getAdapter(config.providerKey);
  if (!adapter) return null;

  const [credentials, input] = await Promise.all([loadCredentials(config), buildShipmentInput(orderId)]);
  const result = await adapter.createShipment(input, credentials);

  await prisma.delivery.update({ where: { orderId }, data: { providerReference: result.providerReference } });
  return result;
}

const EVENT_TO_ORDER_STATUS: Partial<Record<string, OrderStatus>> = {
  PICKED_UP: 'OUT_FOR_DELIVERY',
  IN_TRANSIT: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
};

/**
 * Verifies + applies an inbound webhook call from a delivery provider,
 * looked up by the unguessable per-company `webhookToken` in the URL (see
 * /api/webhooks/delivery/[token]).
 */
export async function handleProviderWebhook(webhookToken: string, rawBody: string, headers: Record<string, string>): Promise<void> {
  const config = await prisma.deliveryProviderConfig.findUnique({ where: { webhookToken } });
  if (!config) throw new NotFoundError('Webhook not found');

  const adapter = getAdapter(config.providerKey);
  if (!adapter) throw new NotFoundError('Provider adapter not found');

  const credentials = await loadCredentials(config);
  const event = adapter.parseWebhookEvent(rawBody, headers, credentials);
  if (!event) throw new ValidationError('Invalid or unrecognized webhook payload');

  const delivery = await prisma.delivery.findFirst({
    where: { providerReference: event.providerReference },
    select: { id: true, orderId: true, order: { select: { merchantId: true, status: true } } },
  });
  if (!delivery) return; // Unknown reference — nothing of ours to update.

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: event.status,
      ...(event.status === 'DELIVERED' && { deliveredAt: new Date() }),
      ...(event.note && { notes: event.note }),
    },
  });

  // Best-effort — mirror the provider's status onto the order where the
  // internal state machine allows it. An out-of-order or already-applied
  // event just leaves Order.status as-is; Delivery.status above is always
  // the source of truth for what the courier actually reported.
  const nextOrderStatus = EVENT_TO_ORDER_STATUS[event.status];
  if (nextOrderStatus && delivery.order.status !== nextOrderStatus) {
    try {
      await ordersService.updateOrderStatus(
        delivery.order.merchantId,
        delivery.orderId,
        nextOrderStatus,
        `Delivery provider update: ${event.status}`
      );
    } catch (err) {
      console.error('[delivery-integrations] Could not mirror provider status onto order', delivery.orderId, err);
    }
  }
}
