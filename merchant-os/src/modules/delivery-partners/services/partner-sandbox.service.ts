import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import type { PlatformShipmentStatus, OrderStatus, Prisma } from '@prisma/client';
import { encryptSecret, decryptSecret } from '@/lib/crypto/secret';
import { shipmentTransitions } from './shipment-state.service';

export const sandboxStatuses = z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']);
const keyHash = (key: string) => createHash('sha256').update(key).digest('hex');
function newKey() { const raw = `wsl_test_${randomBytes(32).toString('hex')}`; return { apiKey: encryptSecret(raw), apiKeyHash: keyHash(raw) }; }
async function activePartner(partnerId: string) {
  const partner = await prisma.deliveryPartner.findUnique({ where: { id: partnerId } });
  if (!partner?.isActive || partner.status === 'SUSPENDED') throw new Error('الشريك غير متاح');
}
export async function createSandboxStore(partnerId: string) {
  await activePartner(partnerId);
  return prisma.partnerSandboxStore.upsert({ where: { partnerId }, update: {}, create: { partnerId, name: 'متجر وصلة التجريبي', ...newKey() } });
}
export async function rotateSandboxKey(partnerId: string) {
  await activePartner(partnerId);
  await prisma.partnerSandboxStore.update({ where: { partnerId }, data: newKey() });
}
export async function authenticateSandbox(key: string) {
  if (!/^wsl_test_[a-f0-9]{64}$/.test(key)) throw new Error('Invalid sandbox credential');
  const store = await prisma.partnerSandboxStore.findUnique({ where: { apiKeyHash: keyHash(key) } });
  if (!store) throw new Error('Invalid sandbox credential');
  await activePartner(store.partnerId);
  return store;
}
export async function createSandboxShipment(partnerId: string, idempotencyKey: string) {
  z.string().min(8).max(120).parse(idempotencyKey);
  await activePartner(partnerId);
  return prisma.$transaction(async tx => {
    const store = await tx.partnerSandboxStore.findUniqueOrThrow({ where: { partnerId } });
    await tx.$queryRaw`SELECT id FROM partner_sandbox_stores WHERE id = ${store.id} FOR UPDATE`;
    const previous = await tx.partnerSandboxShipment.findUnique({ where: { storeId_idempotencyKey: { storeId: store.id, idempotencyKey } } });
    if (previous) return previous;
    if (await tx.partnerSandboxShipment.count({ where: { storeId: store.id } }) >= 100) throw new Error('حد الاختبار 100 شحنة لكل متجر؛ تواصل مع الدعم لتوسعة الاختبار');
    return tx.partnerSandboxShipment.create({ data: { storeId: store.id, idempotencyKey, trackingCode: `TEST-${randomUUID()}`, events: [{ status: 'REQUESTED', at: new Date().toISOString(), source: 'SANDBOX' }] } });
  });
}
export function sandboxTransition(current: PlatformShipmentStatus, next: PlatformShipmentStatus, order: OrderStatus, api = false) {
  const rank: Partial<Record<PlatformShipmentStatus, number>> = { REQUESTED: 0, ASSIGNED: 1, PICKED_UP: 2, IN_TRANSIT: 3, DELIVERED: 4 };
  if (current === next || (rank[current] != null && rank[next] != null && rank[next]! < rank[current]!)) return { applied: false, orderStatus: order };
  if (['DELIVERED', 'FAILED', 'CANCELLED'].includes(current)) throw new Error('الشحنة منتهية ولا تقبل تغيير الحالة');
  if (!shipmentTransitions[current]?.includes(next) && !(api && rank[next] != null && rank[next]! > (rank[current] ?? -1))) throw new Error('انتقال حالة غير مسموح');
  const orderStatus: OrderStatus = next === 'DELIVERED' ? 'DELIVERED' : ['PICKED_UP', 'IN_TRANSIT'].includes(next) ? 'OUT_FOR_DELIVERY' : order;
  return { applied: true, orderStatus };
}
export async function updateSandboxShipment(partnerId: string, id: string, status: PlatformShipmentStatus, api = false) {
  await activePartner(partnerId);
  return prisma.$transaction(async tx => {
    const store = await tx.partnerSandboxStore.findUniqueOrThrow({ where: { partnerId } });
    await tx.$queryRaw`SELECT id FROM partner_sandbox_shipments WHERE id = ${id} AND "storeId" = ${store.id} FOR UPDATE`;
    const shipment = await tx.partnerSandboxShipment.findFirst({ where: { id, storeId: store.id } });
    if (!shipment) throw new Error('الشحنة التجريبية غير موجودة');
    const transition = sandboxTransition(shipment.status, status, shipment.orderStatus, api);
    if (!transition.applied) return { ...transition, shipment };
    const events = Array.isArray(shipment.events) ? shipment.events as Prisma.JsonArray : [];
    const updated = await tx.partnerSandboxShipment.update({ where: { id }, data: { status, orderStatus: transition.orderStatus,
      events: [...events, { status, at: new Date().toISOString(), source: api ? 'SIGNED_WEBHOOK' : 'SANDBOX_UI' }] as Prisma.InputJsonValue } });
    return { ...transition, shipment: updated };
  });
}
export function validSandboxSignature(raw: string, signature: string | null, secret: string) {
  const supplied = signature?.replace(/^sha256=/, '') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}
export async function sandboxWebhook(token: string, raw: string, signature: string | null) {
  if (Buffer.byteLength(raw) > 32768) throw new Error('Payload too large');
  const store = await prisma.partnerSandboxStore.findUnique({ where: { webhookToken: token } });
  if (!store || !validSandboxSignature(raw, signature, decryptSecret(store.apiKey))) throw new Error('Invalid sandbox signature');
  const data = z.object({ providerReference: z.string().min(1).max(200), status: sandboxStatuses }).strict().parse(JSON.parse(raw));
  return updateSandboxShipment(store.partnerId, data.providerReference, data.status, true);
}
