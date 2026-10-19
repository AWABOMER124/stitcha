import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { decryptSecret } from '@/lib/crypto/secret';
import { BusinessRuleError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { applyShipmentState } from './shipment-state.service';
import { validatePartnerEndpoint } from './partner-endpoint';

export async function dispatchShipmentToPartner(shipmentId: string) {
  return prisma.$transaction(async tx => {
    const initial = await tx.platformShipment.findUniqueOrThrow({ where: { id: shipmentId } });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${initial.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${initial.partnerId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM platform_shipments WHERE id = ${shipmentId} FOR UPDATE`;
    const shipment = await tx.platformShipment.findUniqueOrThrow({ where: { id: shipmentId }, include: {
      partner: { include: { providerConfig: true } }, installation: true,
      order: { include: { branch: true, merchant: true, customer: true, delivery: true, items: true, payment: true } },
    } });
    if (shipment.providerReference) return { providerReference: shipment.providerReference };
    // A cancellation can win the race with the queued create job. Treating it
    // as a successful no-op prevents a dead-letter and, more importantly,
    // prevents creating a shipment that the merchant has already cancelled.
    if (shipment.status === 'CANCELLED' || ['CANCELLED', 'REJECTED'].includes(shipment.order.status)) return { skipped: true as const };
    if (shipment.status !== 'REQUESTED' || shipment.order.status === 'DELIVERED') throw new BusinessRuleError('Shipment cannot be dispatched');
    const config = shipment.partner.providerConfig;
    if (!shipment.partner.isActive || shipment.partner.status !== 'ACTIVE' || shipment.partner.appStatus !== 'PUBLISHED' || !config?.isActive) throw new BusinessRuleError('Partner integration is inactive');
    if (config.providerKey === 'TEST_SIMULATOR') {
      const providerReference = `TEST-${shipment.id}`;
      await tx.platformShipment.update({ where: { id: shipment.id }, data: { providerReference } });
      return { providerReference };
    }
    const connection = shipment.installation ?? await tx.merchantDeliveryPartner.findUnique({ where: { merchantId_partnerId: { merchantId: shipment.order.merchantId, partnerId: shipment.partnerId } } });
    if (!connection?.isActive || connection.revokedAt || connection.merchantId !== shipment.order.merchantId || connection.partnerId !== shipment.partnerId) throw new BusinessRuleError('Partner installation is inactive');
    if (!shipment.installationId) await tx.platformShipment.update({ where: { id: shipment.id }, data: { installationId: connection.id } });
    const pickup = shipment.order.branch ?? await tx.branch.findFirst({ where: { merchantId: shipment.order.merchantId, isMain: true, isActive: true } });
    if (pickup?.lat == null || pickup.lng == null || shipment.order.delivery?.lat == null || shipment.order.delivery.lng == null) throw new BusinessRuleError('Pickup and dropoff coordinates required');
    const appPayload = {
      id: `evt_${shipment.id}_created`, type: 'shipment.created', apiVersion: '2026-10-20', occurredAt: new Date().toISOString(),
      partner: { id: shipment.partnerId, clientId: config.clientId ?? null },
      installation: { id: connection.id, merchantId: connection.merchantId },
      store: { id: shipment.order.merchant.id, name: shipment.order.merchant.name, slug: shipment.order.merchant.slug,
        phone: shipment.order.merchant.phone, email: shipment.order.merchant.email, currency: shipment.order.merchant.currency },
      shipment: { id: shipment.id, trackingCode: shipment.trackingCode, orderId: shipment.order.id, orderNumber: shipment.order.orderNumber,
        status: shipment.status, createdAt: shipment.createdAt.toISOString() },
      sender: { branchId: pickup.id, name: pickup.name, phone: pickup.phone ?? shipment.order.merchant.phone,
        email: pickup.email ?? shipment.order.merchant.email, address: pickup.address ?? shipment.order.merchant.address,
        location: { lat: pickup.lat, lng: pickup.lng } },
      recipient: { customerId: shipment.order.customerId, name: shipment.order.customerName ?? shipment.order.customer.name,
        phone: shipment.order.customerPhone ?? shipment.order.customer.phone, email: shipment.order.customer.email,
        address: shipment.order.customerAddress ?? shipment.order.customer.address,
        location: { lat: shipment.order.delivery.lat, lng: shipment.order.delivery.lng } },
      payment: { method: shipment.order.paymentMethod, status: shipment.order.payment?.status ?? null,
        codAmount: shipment.order.paymentMethod === 'CASH' ? Number(shipment.order.total) : 0, currency: shipment.currency },
      amounts: { subtotal: Number(shipment.order.subtotal), discount: Number(shipment.order.discount), tax: Number(shipment.order.tax),
        deliveryFee: Number(shipment.fee), orderTotal: Number(shipment.order.total), currency: shipment.currency },
      packages: [{ reference: shipment.order.orderNumber, items: shipment.order.items.map(item => {
        const snapshot = item.productSnapshot as { name?: unknown; sku?: unknown; image?: unknown } | null;
        return { productId: item.productId, name: typeof snapshot?.name === 'string' ? snapshot.name : 'Item',
          sku: typeof snapshot?.sku === 'string' ? snapshot.sku : null, image: typeof snapshot?.image === 'string' ? snapshot.image : null,
          quantity: item.quantity, unitPrice: Number(item.unitPrice), total: Number(item.total), modifiers: item.modifiers, notes: item.notes };
      }) }],
      notes: shipment.order.notes,
    };
    const appMode = config.integrationMode === 'APP_V1';
    const legacyPayload = {
      event: 'shipment.create', version: '2026-10-01', eventId: `shipment.create:${shipment.id}`,
      occurredAt: new Date().toISOString(), shipmentId: shipment.id, trackingCode: shipment.trackingCode, orderNumber: shipment.order.orderNumber,
      pickup: { name: pickup.name, phone: pickup.phone ?? shipment.order.merchant.phone, address: pickup.address ?? shipment.order.merchant.address, lat: pickup.lat, lng: pickup.lng },
      dropoff: { name: shipment.order.customerName, phone: shipment.order.customerPhone, address: shipment.order.customerAddress, lat: shipment.order.delivery.lat, lng: shipment.order.delivery.lng },
      payment: appPayload.payment, pricing: { deliveryFee: Number(shipment.fee), orderTotal: Number(shipment.order.total), currency: shipment.currency },
      items: shipment.order.items.map(item => {
        const snapshot = item.productSnapshot as { name?: unknown; sku?: unknown } | null;
        return { name: typeof snapshot?.name === 'string' ? snapshot.name : 'Item', sku: typeof snapshot?.sku === 'string' ? snapshot.sku : null,
          quantity: item.quantity, unitPrice: Number(item.unitPrice), total: Number(item.total), notes: item.notes };
      }), notes: shipment.order.notes,
    };
    const endpoint = appMode ? config.outboundWebhookUrl : config.apiBaseUrl ? `${config.apiBaseUrl.replace(/\/$/, '')}/shipments` : null;
    const signingSecret = appMode ? config.webhookSigningSecret : config.credentials;
    if (!endpoint || !signingSecret || (appMode && !config.clientId)) throw new BusinessRuleError('Partner integration is incomplete');
    validatePartnerEndpoint(endpoint, config.approvedOrigin);
    const rawBody = JSON.stringify(appMode ? appPayload : legacyPayload);
    const response = await fetch(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: appMode
        ? { 'content-type': 'application/json', 'x-wasla-client-id': config.clientId!, 'x-wasla-event': appPayload.type,
            'x-wasla-event-id': appPayload.id, 'x-wasla-signature': `sha256=${createHmac('sha256', decryptSecret(signingSecret)).update(rawBody).digest('hex')}`,
            'idempotency-key': appPayload.id }
        : { 'content-type': 'application/json', authorization: `Bearer ${decryptSecret(signingSecret)}`, 'idempotency-key': shipment.id },
      body: rawBody,
    });
    if (!response.ok) throw new BusinessRuleError(`Partner API rejected shipment (${response.status})`);
    if (response.status === 204 || !response.headers.get('content-type')?.includes('application/json')) return { accepted: true as const };
    const result = z.object({ providerReference: z.string().trim().min(1).max(200).optional() }).parse(await response.json());
    if (result.providerReference) await tx.platformShipment.update({ where: { id: shipment.id }, data: { providerReference: result.providerReference } });
    return { accepted: true as const, ...result };
  }, { timeout: 20_000, maxWait: 20_000 });
}

/** Notify the provider after a merchant cancels an accepted shipment. */
export async function cancelShipmentAtPartner(shipmentId: string) {
  const shipment = await prisma.platformShipment.findUnique({
    where: { id: shipmentId },
    include: { partner: { include: { providerConfig: true } }, installation: true,
      order: { select: { id: true, merchantId: true, orderNumber: true } } },
  });
  if (!shipment || shipment.status !== 'CANCELLED') return { skipped: true as const };
  const config = shipment.partner.providerConfig;
  if (config?.providerKey === 'TEST_SIMULATOR') return { cancelled: true as const };
  if (!shipment.partner.isActive || shipment.partner.status !== 'ACTIVE' || !config?.isActive) {
    throw new BusinessRuleError('Partner cancellation integration is inactive');
  }
  const appMode = config.integrationMode === 'APP_V1';
  if (!appMode && !shipment.providerReference) return { skipped: true as const };
  const endpoint = appMode ? config.outboundWebhookUrl : config.apiBaseUrl ? `${config.apiBaseUrl.replace(/\/$/, '')}/shipments/${encodeURIComponent(shipment.providerReference!)}/cancel` : null;
  const signingSecret = appMode ? config.webhookSigningSecret : config.credentials;
  if (!endpoint || !signingSecret || (appMode && !config.clientId)) throw new BusinessRuleError('Partner cancellation integration is incomplete');
  validatePartnerEndpoint(endpoint, config.approvedOrigin);
  const payload = appMode
    ? { id: `evt_${shipment.id}_cancelled`, type: 'shipment.cancelled', apiVersion: '2026-10-20', occurredAt: new Date().toISOString(),
        partner: { id: shipment.partnerId, clientId: config.clientId },
        installation: { id: shipment.installation?.id ?? null, merchantId: shipment.order.merchantId },
        shipment: { id: shipment.id, providerReference: shipment.providerReference, trackingCode: shipment.trackingCode,
          orderId: shipment.order.id, orderNumber: shipment.order.orderNumber, status: shipment.status }, reason: 'ORDER_CANCELLED' }
    : { event: 'shipment.cancel', version: '2026-10-01', eventId: `shipment.cancel:${shipment.id}`,
        occurredAt: new Date().toISOString(), shipmentId: shipment.id, providerReference: shipment.providerReference,
        trackingCode: shipment.trackingCode, orderNumber: shipment.order.orderNumber, reason: 'ORDER_CANCELLED' };
  const rawBody = JSON.stringify(payload);
  const response = await fetch(endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: appMode
      ? { 'content-type': 'application/json', 'x-wasla-client-id': config.clientId!, 'x-wasla-event': 'shipment.cancelled',
          'x-wasla-event-id': `evt_${shipment.id}_cancelled`, 'x-wasla-signature': `sha256=${createHmac('sha256', decryptSecret(signingSecret)).update(rawBody).digest('hex')}`,
          'idempotency-key': `evt_${shipment.id}_cancelled` }
      : { 'content-type': 'application/json', authorization: `Bearer ${decryptSecret(signingSecret)}`, 'idempotency-key': `cancel:${shipment.id}` },
    body: rawBody,
  });
  if (!response.ok) throw new BusinessRuleError(`Partner API rejected cancellation (${response.status})`);
  return { cancelled: true as const };
}

const webhookSchema = z.object({
  eventId: z.string().trim().min(8).max(200).optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  providerReference: z.string().trim().min(1).max(200),
  status: z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']),
  note: z.string().trim().max(1000).optional(),
}).strict();
export async function handlePartnerWebhook(token: string, rawBody: string, signature: string | null) {
  if (Buffer.byteLength(rawBody) > 32_768) throw new BusinessRuleError('Webhook too large');
  const config = await prisma.deliveryPartnerProviderConfig.findUnique({ where: { webhookToken: token }, include: { partner: true } });
  if (!config?.isActive) throw new NotFoundError('Webhook not found');
  if (!config.partner.isActive || config.partner.status !== 'ACTIVE') throw new BusinessRuleError('Partner is suspended');
  if (!config.credentials) throw new BusinessRuleError('Partner webhook secret is not configured');
  const expected = createHmac('sha256', decryptSecret(config.credentials)).update(rawBody).digest('hex');
  const actual = signature?.replace(/^sha256=/, '') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(actual) || !timingSafeEqual(Buffer.from(actual.toLowerCase()), Buffer.from(expected))) throw new UnauthorizedError('Invalid webhook signature');
  const data = webhookSchema.parse(JSON.parse(rawBody));
  const shipment = await prisma.platformShipment.findFirst({ where: { partnerId: config.partnerId, providerReference: data.providerReference } });
  if (!shipment) throw new NotFoundError('Shipment reference not found');
  return applyShipmentState({ partnerId: config.partnerId, shipmentId: shipment.id, status: data.status, note: data.note, actorType: 'PARTNER_API',
    metadata: { eventId: data.eventId ?? null, occurredAt: data.occurredAt ?? null } });
}
