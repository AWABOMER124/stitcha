import type { Prisma } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
import { decryptSecret } from '@/lib/crypto/secret';
import { validatePartnerEndpoint } from './partner-endpoint';
import { isQiadIntegration as supportsPartnerWaybill } from './partner-protocol';
export { supportsPartnerWaybill };
const include = { returnShipment: true, partner: { include: { providerConfig: true } }, installation: true, order: { select: { merchantId: true } } } as const;
export async function merchantWaybill(merchantId: string, orderId: string, isReturn = false) {
  const row = await prisma.platformShipment.findFirst({ where: { orderId, order: { merchantId } }, include });
  if (!row) throw new NotFoundError('الشحنة غير موجودة لهذا المتجر.');
  return fetchWaybill(row, isReturn);
}
export async function partnerWaybill(partnerId: string, shipmentId: string, isReturn = false) {
  const row = await prisma.platformShipment.findFirst({ where: { id: shipmentId, partnerId }, include });
  if (!row) throw new NotFoundError('الشحنة غير موجودة لهذه الشركة.');
  return fetchWaybill(row, isReturn);
}
type Shipment = Prisma.PlatformShipmentGetPayload<{ include: typeof include }>;
async function fetchWaybill(row: Shipment, isReturn: boolean) {
 const shipment = isReturn ? row.returnShipment : row;
 if (!shipment?.providerReference) throw new BusinessRuleError('لم تصدر بوليصة الشركة بعد.');
 const config = row.partner.providerConfig, installation = row.installation;
 if (!row.partner.isActive || row.partner.status !== 'ACTIVE' || !config?.isActive || config.integrationMode !== 'APP_V1' || !config.clientId || !config.webhookSigningSecret || !supportsPartnerWaybill(config.outboundWebhookUrl) || !installation?.isActive || installation.revokedAt || installation.merchantId !== row.order.merchantId || installation.partnerId !== row.partnerId) throw new BusinessRuleError('ربط الشركة أو تثبيت المتجر غير فعال لطباعة البوليصة.');
 const endpoint = new URL(config.outboundWebhookUrl!); endpoint.pathname = '/api/method/qiad_logistics.wassla_webhooks.download_waybill'; endpoint.search = ''; endpoint.hash = '';
 validatePartnerEndpoint(endpoint.toString(), config.approvedOrigin);
 const id = `print_${randomUUID()}`;
 const event = { id, type: 'shipment.label.requested', occurredAt: new Date().toISOString(), partner: { id: row.partnerId, clientId: config.clientId }, installation: { id: installation.id, merchantId: installation.merchantId }, store: { id: row.order.merchantId }, shipment: { id: shipment.id, providerReference: shipment.providerReference } };
 const raw = JSON.stringify(event);
 const response = await fetch(endpoint, { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', 'x-wasla-client-id': config.clientId, 'x-wasla-event': event.type, 'x-wasla-event-id': id, 'idempotency-key': id, 'x-wasla-signature': `sha256=${createHmac('sha256', decryptSecret(config.webhookSigningSecret)).update(raw).digest('hex')}` }, body: raw });
 if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/pdf') || !response.body) throw new BusinessRuleError('تعذر تحميل البوليصة من الشركة. حاول مجددًا بعد قليل.');
 const max = 8 * 1024 * 1024;
 if (Number(response.headers.get('content-length')) > max) throw new BusinessRuleError('ملف البوليصة أكبر من الحد المسموح.');
 const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
 try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) throw new BusinessRuleError('ملف البوليصة أكبر من الحد المسموح.'); chunks.push(value); } } finally { await reader.cancel().catch(() => {}); }
 const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new BusinessRuleError('ملف البوليصة غير صالح.');
 return { bytes: bytes.buffer, filename: `WASLA-${shipment.trackingCode.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf` };
}
