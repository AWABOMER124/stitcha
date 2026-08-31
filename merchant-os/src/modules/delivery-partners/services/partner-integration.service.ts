import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { decryptSecret } from '@/lib/crypto/secret';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { applyShipmentState } from './shipment-state.service';
import { validatePartnerEndpoint } from './partner-endpoint';

export async function dispatchShipmentToPartner(shipmentId: string) {
  return prisma.$transaction(async tx => {
    const initial = await tx.platformShipment.findUniqueOrThrow({ where: { id: shipmentId } });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${initial.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${initial.partnerId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM platform_shipments WHERE id = ${shipmentId} FOR UPDATE`;
    const shipment = await tx.platformShipment.findUniqueOrThrow({ where: { id: shipmentId }, include: {
      partner: { include: { providerConfig: true } }, order: { include: { branch: true, merchant: true, delivery: true } },
    } });
    if (shipment.providerReference) return { providerReference: shipment.providerReference };
    if (shipment.status !== 'REQUESTED' || ['CANCELLED', 'REJECTED', 'DELIVERED'].includes(shipment.order.status)) throw new BusinessRuleError('Shipment cannot be dispatched');
    const config = shipment.partner.providerConfig;
    if (!shipment.partner.isActive || shipment.partner.status !== 'ACTIVE' || shipment.partner.appStatus !== 'PUBLISHED' || !config?.isActive) throw new BusinessRuleError('Partner integration is inactive');
    if (config.providerKey === 'TEST_SIMULATOR') {
      const providerReference = `TEST-${shipment.id}`;
      await tx.platformShipment.update({ where: { id: shipment.id }, data: { providerReference } });
      return { providerReference };
    }
    if (config.providerKey !== 'PARTNER_HTTP_V1' || !config.apiBaseUrl || !config.credentials) throw new BusinessRuleError('Partner integration is incomplete');
    validatePartnerEndpoint(config.apiBaseUrl);
    const pickup = shipment.order.branch ?? await tx.branch.findFirst({ where: { merchantId: shipment.order.merchantId, isMain: true, isActive: true } });
    if (pickup?.lat == null || pickup.lng == null || shipment.order.delivery?.lat == null || shipment.order.delivery.lng == null) throw new BusinessRuleError('Pickup and dropoff coordinates required');
    const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}/shipments`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${decryptSecret(config.credentials)}`, 'idempotency-key': shipment.id },
      body: JSON.stringify({ shipmentId: shipment.id, trackingCode: shipment.trackingCode, orderNumber: shipment.order.orderNumber,
        pickup: { name: pickup.name, phone: pickup.phone ?? shipment.order.merchant.phone, address: pickup.address ?? shipment.order.merchant.address, lat: pickup.lat, lng: pickup.lng },
        dropoff: { name: shipment.order.customerName, phone: shipment.order.customerPhone, address: shipment.order.customerAddress, lat: shipment.order.delivery.lat, lng: shipment.order.delivery.lng },
        codAmount: Number(shipment.order.total), currency: shipment.currency,
      }),
    });
    if (!response.ok) throw new BusinessRuleError(`Partner API rejected shipment (${response.status})`);
    const result = z.object({ providerReference: z.string().trim().min(1).max(200) }).parse(await response.json());
    await tx.platformShipment.update({ where: { id: shipment.id }, data: { providerReference: result.providerReference } });
    return result;
  }, { timeout: 20_000, maxWait: 20_000 });
}

const webhookSchema = z.object({ providerReference: z.string().min(1).max(200), status: z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']), note: z.string().max(1000).optional() });
export async function handlePartnerWebhook(token: string, rawBody: string, signature: string | null) {
  if (Buffer.byteLength(rawBody) > 32_768) throw new BusinessRuleError('Webhook too large');
  const config = await prisma.deliveryPartnerProviderConfig.findUnique({ where: { webhookToken: token }, include: { partner: true } });
  if (!config?.isActive) throw new NotFoundError('Webhook not found');
  if (!config.partner.isActive || config.partner.status !== 'ACTIVE') throw new BusinessRuleError('Partner is suspended');
  if (!config.credentials) throw new BusinessRuleError('Partner webhook secret is not configured');
  const expected = createHmac('sha256', decryptSecret(config.credentials)).update(rawBody).digest('hex');
  const actual = signature?.replace(/^sha256=/, '') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(actual) || !timingSafeEqual(Buffer.from(actual.toLowerCase()), Buffer.from(expected))) throw new BusinessRuleError('Invalid webhook signature');
  const data = webhookSchema.parse(JSON.parse(rawBody));
  const shipment = await prisma.platformShipment.findFirst({ where: { partnerId: config.partnerId, providerReference: data.providerReference } });
  if (!shipment) throw new NotFoundError('Shipment reference not found');
  return applyShipmentState({ partnerId: config.partnerId, shipmentId: shipment.id, status: data.status, note: data.note, actorType: 'PARTNER_API' });
}
