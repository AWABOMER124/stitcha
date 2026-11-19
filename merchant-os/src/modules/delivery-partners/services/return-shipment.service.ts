import { isQiadIntegration } from './partner-protocol';
import { providerAddress } from './provider-coverage';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createHmac } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { decryptSecret } from '@/lib/crypto/secret';
import { getOrderDeliveryAddress, hasCompleteDeliveryAddress, orderAddressFields, validateOrderAddress } from '@/lib/addresses/order-address';
import { enqueueJob } from '@/services/jobs/outbox.service';
import { validatePartnerEndpoint } from './partner-endpoint';
import { shipmentTransitions } from './shipment-state.service';

export const returnRequestSchema = z.object({
  ...orderAddressFields,
  customerAddress: z.string().trim().min(2).max(500),
  customerName: z.string().trim().min(2).max(120), customerPhone: z.string().trim().min(7).max(32),
  reason: z.string().trim().min(3).max(500),
}).superRefine((value, context) => validateOrderAddress({ ...value, deliveryAddressVersion: '3', deliveryMethod: 'MERCHANT_DELIVERY' }, context));

export async function createReturnShipment(merchantId: string, orderId: string, input: z.infer<typeof returnRequestSchema>) {
  const data = returnRequestSchema.parse(input);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} AND "merchantId" = ${merchantId} FOR UPDATE`;
    const original = await tx.platformShipment.findFirst({ where: { orderId, order: { merchantId } }, include: { returnShipment: true, order: { include: { customer: true, delivery: true } }, partner: { include: { providerConfig: true } }, installation: true } });
    if (!original) throw new NotFoundError('الشحنة الأصلية غير موجودة لهذا المتجر.');
    if (original.returnShipment) return original.returnShipment;
    if (original.status !== 'DELIVERED' || original.order.status !== 'DELIVERED' || !original.providerReference) throw new BusinessRuleError('إنشاء الرجيع متاح بعد تسليم الشحنة الأصلية وإصدار مرجعها من الشركة.');
    if (!original.partner.isActive || original.partner.status !== 'ACTIVE' || !original.partner.providerConfig?.isActive || original.partner.providerConfig.integrationMode !== 'APP_V1' || !original.installation?.isActive || original.installation.revokedAt) throw new BusinessRuleError('تكامل شركة الشحن أو تثبيت المتجر غير فعال.');
    if (isQiadIntegration(original.partner.providerConfig?.outboundWebhookUrl) && original.installation?.providerSyncStatus!=='READY') throw new BusinessRuleError('انتظر اكتمال ربط المتجر بالشركة قبل إنشاء الرجيع.');
    const address = getOrderDeliveryAddress(original.order);
    if (!hasCompleteDeliveryAddress(address)) throw new BusinessRuleError('أكمل عنوان استلام الرجيع من العميل قبل الإنشاء.');
    const pickup = { name: original.order.customerName ?? original.order.customer.name, phone: original.order.customerPhone ?? original.order.customer.phone, ...address, location: null };
    const destination = { name: data.customerName, phone: data.customerPhone, state: data.customerState!, city: data.customerCity!, district: data.customerDistrict!, address: data.customerAddress, addressDescription: data.customerAddressDescription ?? null, location: null };
    if (!providerAddress(original.partner.providerConfig,destination)) throw new BusinessRuleError('عنوان استلام المتجر للرجيع خارج تغطية الشركة: الخرطوم وأم درمان وبحري.');
    const row = await tx.platformReturnShipment.create({ data: { originalShipmentId: original.id, trackingCode: `WSLR-${nanoid(10).toUpperCase()}`, reason: data.reason, pickup, destination } });
    await enqueueJob({ topic: 'delivery.partner.return.dispatch', payload: { returnId: row.id }, idempotencyKey: `delivery:return:${row.id}`, maxAttempts: 8 }, tx);
    return row;
  });
}

export async function dispatchReturnShipment(returnId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM platform_return_shipments WHERE id = ${returnId} FOR UPDATE`;
    const row = await tx.platformReturnShipment.findUniqueOrThrow({ where: { id: returnId }, include: { originalShipment: { include: { partner: { include: { providerConfig: true } }, installation: true, order: { include: { merchant: true, items: true } } } } } });
    if (row.providerReference || row.status !== 'REQUESTED') return { skipped: true };
    const original = row.originalShipment, config = original.partner.providerConfig;
    if (!original.partner.isActive || original.partner.status !== 'ACTIVE' || !config?.isActive || config.integrationMode !== 'APP_V1' || !config.outboundWebhookUrl || !config.webhookSigningSecret || !config.clientId || !original.installation?.isActive || original.installation.revokedAt) throw new BusinessRuleError('Return integration is inactive');
    validatePartnerEndpoint(config.outboundWebhookUrl, config.approvedOrigin);
    const id = `evt_${row.id}_created`;
    const payload = { id, type: 'shipment.created', apiVersion: '2026-10-20', occurredAt: row.createdAt.toISOString(),
      partner: { id: original.partnerId, clientId: config.clientId }, installation: { id: original.installation.id, merchantId: original.order.merchantId },
      store: { id: original.order.merchantId, name: original.order.merchant.name, slug: original.order.merchant.slug, currency: original.currency },
      shipment: { id: row.id, kind: 'RETURN', parentShipmentId: original.id, parentProviderReference: original.providerReference, trackingCode: row.trackingCode, orderId: original.orderId, orderNumber: original.order.orderNumber, status: row.status },
      sender: row.pickup, recipient: row.destination,
      payment: { method: 'NONE', status: 'NOT_REQUIRED', codAmount: 0, currency: original.currency },
      packages: [{ reference: original.order.orderNumber, items: original.order.items.map(item => ({ productId: item.productId, quantity: item.quantity, sku: (item.productSnapshot as { sku?: string })?.sku ?? item.productId, name: (item.productSnapshot as { name?: string })?.name ?? 'صنف' })) }],
      notes: row.reason,
    };
    const raw = JSON.stringify(payload);
    const response = await fetch(config.outboundWebhookUrl, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'content-type': 'application/json', 'x-wasla-client-id': config.clientId, 'x-wasla-event': payload.type, 'x-wasla-event-id': id, 'idempotency-key': id, 'x-wasla-signature': `sha256=${createHmac('sha256', decryptSecret(config.webhookSigningSecret)).update(raw).digest('hex')}` }, body: raw });
    if (!response.ok) throw new BusinessRuleError(`Partner rejected return (${response.status})`);
    if (response.headers.get('content-type')?.includes('application/json')) {
      const result = z.object({ providerReference: z.string().trim().min(1).max(200).optional() }).parse(await response.json());
      if (result.providerReference) await tx.platformReturnShipment.update({ where: { id: row.id }, data: { providerReference: result.providerReference } });
    }
    return { accepted: true };
  }, { timeout: 20000 });
}

export async function applyReturnShipmentState(partnerId: string, returnId: string, input: { eventId: string; status: import('@prisma/client').PlatformShipmentStatus; providerReference?: string; note?: string }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM platform_return_shipments WHERE id = ${returnId} FOR UPDATE`;
    const row = await tx.platformReturnShipment.findFirst({ where: { id: returnId, originalShipment: { partnerId } }, include: { originalShipment: { include: { installation: true } } } });
    if (!row) throw new NotFoundError('Return shipment not found');
    if (!row.originalShipment.installation?.isActive || row.originalShipment.installation.revokedAt) throw new BusinessRuleError('Store installation is inactive');
    if (await tx.platformReturnEvent.findUnique({ where: { returnId_eventId: { returnId, eventId: input.eventId } } })) return { applied: false, reason: 'duplicate_event' };
    const rank: Record<string, number> = { REQUESTED: 0, ASSIGNED: 1, PICKED_UP: 2, IN_TRANSIT: 3, DELIVERED: 4 };
    if (rank[row.status] != null && rank[input.status] != null && rank[input.status] < rank[row.status]) return { applied: false, reason: 'outdated' };
    if (row.status !== input.status && (!(rank[input.status] != null && rank[row.status] != null && rank[input.status] > rank[row.status]) && !shipmentTransitions[row.status]?.includes(input.status))) throw new BusinessRuleError('Invalid return status transition');
    if (row.providerReference && input.providerReference && row.providerReference !== input.providerReference) throw new BusinessRuleError('Return reference cannot change');
    await tx.platformReturnShipment.update({ where: { id: row.id }, data: { status: input.status, ...(input.providerReference ? { providerReference: input.providerReference } : {}) } });
    await tx.platformReturnEvent.create({ data: { returnId, eventId: input.eventId, status: input.status, note: input.note } });
    return { applied: row.status !== input.status };
  });
}
