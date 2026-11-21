import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { hash } from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { setMerchantPartner, syncMerchantInstallation } from './installation-sync.service';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { quotePlatformDelivery, acceptDeliveryQuote, } from './delivery-operations.service';
import { merchantWaybill } from './partner-waybill.service';
import { createReturnShipment, dispatchReturnShipment } from './return-shipment.service';
import { recordPartnerCod, confirmMerchantCod } from './cod-records.service';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('PSL acceptance requires the isolated test database');
const origin = process.env.PSL_ACCEPTANCE_RPC_ORIGIN;
const partnerId = 'psl-acceptance-partner', clientId = 'psl-acceptance-client', secret = 'synthetic-psl-signing-secret';
const endpoint = 'https://api-psl.qiad.cloud/api/method/qiad_logistics.wassla_webhooks.receive';
const nativeFetch = globalThis.fetch;
let merchantId: string, installationId: string, orderId: string, shipmentId: string, returnId: string;
const suffix = randomUUID().slice(0, 8);
async function waitFor<T>(get: () => Promise<T>, matches: (value: T) => boolean) {
  const until = Date.now() + 120000;
  while (Date.now() < until) { const value = await get(); if (matches(value)) return value; await new Promise(resolve => setTimeout(resolve, 1000)); }
  throw new Error('Isolated PSL callback did not reach the expected state');
}
async function control(type: 'acceptance.inspect' | 'acceptance.advance', id: string, state?: string) {
  const eventId = 'test_' + randomUUID(); const body = JSON.stringify({ id: eventId, type, partner: { id: partnerId, clientId }, installation: { id: installationId, merchantId }, store: { id: merchantId }, shipment: { id }, state });
  const response = await nativeFetch(`${origin}/api/method/qiad_logistics.psl_acceptance_controls.control`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-frappe-site-name': 'psl-test.internal', 'x-wasla-client-id': clientId, 'x-wasla-event': type, 'x-wasla-event-id': eventId, 'idempotency-key': eventId, 'x-wasla-signature': 'sha256=' + createHmac('sha256', secret).update(body).digest('hex') }, body });
  if (!response.ok) throw new Error(`Test-only PSL control rejected (${response.status})`);
  return (await response.json()).message;
}
describe.skipIf(!origin)('WASLA ↔ current PSL image over isolated HTTP', () => {
  beforeAll(async () => {
    const url = new URL(origin!); if (url.protocol !== 'http:' || url.hostname !== 'backend' || url.port !== '8000') throw new Error('Private PSL test origin only');
    process.env.SECRETS_ENCRYPTION_KEY = 'synthetic-psl-bridge-encryption-only';
    vi.stubGlobal('fetch', async (input: string | URL | Request, options?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.origin !== 'https://api-psl.qiad.cloud') throw new Error('Unexpected external request in PSL acceptance');
      const response = await nativeFetch(origin + url.pathname, { ...options, headers: { ...Object.fromEntries(new Headers(options?.headers)), 'x-frappe-site-name': 'psl-test.internal' } });
      if (!response.ok) { const error = await response.clone().json(); console.error('Isolated PSL rejection', response.status, error.exc_type, error.exception); }
      return response;
    });
    const merchant = await prisma.merchant.create({ data: { name: 'Synthetic PSL store', slug: `psl-${suffix}`, businessType: 'RETAIL', subscriptionMarket: 'SA', currency: 'SAR', status: 'ACTIVE', phone: '+966500000000', address: 'الرياض، حي العليا، شارع اختبار 1', branches: { create: { name: 'Synthetic Riyadh branch', isMain: true, phone: '+966500000000', address: 'الرياض، حي العليا، شارع اختبار 1' } } } });
    merchantId = merchant.id;
    const category = await prisma.category.create({ data: { merchantId, name: 'Synthetic', slug: `psl-${suffix}` } });
    const product = await prisma.product.create({ data: { merchantId, categoryId: category.id, name: 'Synthetic parcel', slug: `psl-${suffix}`, price: 100 } });
    const data = { name: 'Synthetic Pearl Star', slug: 'psl-acceptance', status: 'ACTIVE' as const, isActive: true, appStatus: 'PUBLISHED' as const, supportsCod: true };
    await prisma.deliveryPartner.upsert({ where: { id: partnerId }, update: data, create: { id: partnerId, ...data } });
    const config = { providerKey: 'PARTNER_HTTP_V1', integrationMode: 'APP_V1' as const, market: 'SA', isActive: true, clientId, clientSecretHash: await hash('synthetic-psl-client-secret', 4), outboundWebhookUrl: endpoint, approvedOrigin: 'https://api-psl.qiad.cloud', webhookSigningSecret: encryptSecret(secret) };
    await prisma.deliveryPartnerProviderConfig.upsert({ where: { partnerId }, update: config, create: { partnerId, ...config } });
    const area = await prisma.deliveryPartnerServiceArea.create({ data: { partnerId, name: 'Synthetic Riyadh', code: `PSL-${suffix}`, state: 'الرياض', allCities: true, allDistricts: true } });
    await prisma.deliveryPartnerPricingRule.create({ data: { partnerId, serviceAreaId: area.id, baseFee: 20, perKmFee: 0, currency: 'SAR' } });
    const order = await placeOrder(merchant.slug, placeOrderSchema.parse({ customerName: 'Synthetic recipient', customerPhone: '0500000000', customerState: 'الرياض', customerCity: 'الرياض', customerDistrict: 'العليا', customerAddress: 'شارع الاختبار، مبنى 7', customerAddressDescription: 'بجوار المعلم التجريبي', deliveryAddressVersion: '3', deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', items: [{ productId: product.id, quantity: 1 }] }));
    orderId = order.orderId; await prisma.order.update({ where: { id: orderId }, data: { status: 'READY' } });
  }, 60000);
  afterAll(() => vi.unstubAllGlobals());
  it('registers only the opted-in Saudi store, dispatches once and prints the native Pearl Star waybill', async () => {
    const installation = await setMerchantPartner(merchantId, partnerId, true); installationId = installation.id;
    await syncMerchantInstallation(installation.id, installation.providerSyncVersion);
    expect(await prisma.merchantDeliveryPartner.findUnique({ where: { id: installation.id } })).toMatchObject({ providerSyncStatus: 'READY' });
    const quotes = await quotePlatformDelivery(orderId); expect(quotes).toHaveLength(1);
    const shipment = await acceptDeliveryQuote(orderId, quotes[0].id); shipmentId = shipment.id;
    const ready = await waitFor(() => prisma.platformShipment.findUniqueOrThrow({ where: { id: shipment.id } }), row => Boolean(row.providerReference));
    const native = await control('acceptance.inspect', shipmentId);
    expect(native).toMatchObject({ name: ready.providerReference, recipient_state: 'الرياض', recipient_city: 'الرياض', recipient_district: 'العليا', currency: 'SAR', wasla_fee_payer: 'MERCHANT' });
    expect(Number(native.cod_amount)).toBe(100); expect(Number(native.wasla_shipping_fee)).toBe(20); expect(Number(native.wasla_collection_fee)).toBe(2);
    expect(native.recipient_address).toContain('مبنى 7');
    const pdf = await merchantWaybill(merchantId, orderId); expect(pdf.bytes.byteLength).toBeGreaterThan(1000); await writeFile('/tmp/psl-outbound.pdf', Buffer.from(pdf.bytes));
    await expect(merchantWaybill('another-store', orderId)).rejects.toThrow();
  }, 180000);
  it('receives carrier delivery callbacks, records COD custody and prints a zero-COD reverse shipment', async () => {
    for (const [native, platform] of [['Picked Up', 'PICKED_UP'], ['In Transit', 'IN_TRANSIT'], ['Delivered', 'DELIVERED']]) {
      await control('acceptance.advance', shipmentId, native);
      await waitFor(() => prisma.platformShipment.findUniqueOrThrow({ where: { id: shipmentId } }), row => row.status === platform);
    }
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('DELIVERED');
    await recordPartnerCod(partnerId, 'synthetic-operator', shipmentId, 'COLLECTED', { amount: 100, currency: 'SAR', reference: 'synthetic-collected' });
    await recordPartnerCod(partnerId, 'synthetic-operator', shipmentId, 'REMITTED', { amount: 100, currency: 'SAR', reference: 'synthetic-remitted' });
    await confirmMerchantCod(merchantId, 'synthetic-merchant', shipmentId);
    const returned = await createReturnShipment(merchantId, orderId, { customerName: 'Synthetic return recipient', customerPhone: '+966500000000', customerState: 'الرياض', customerCity: 'الرياض', customerDistrict: 'العليا', customerAddress: 'عنوان متجر الرجيع، مبنى 1', reason: 'طلب استرجاع تجريبي' });
    returnId = returned.id; await dispatchReturnShipment(returnId);
    await waitFor(() => prisma.platformReturnShipment.findUniqueOrThrow({ where: { id: returnId } }), row => Boolean(row.providerReference));
    const native = await control('acceptance.inspect', returnId);
    expect(native.shipment_type).toBe('Return'); expect(Number(native.cod_amount)).toBe(0); expect(Number(native.wasla_collection_fee)).toBe(0); expect(native.wasla_original_shipment).toBeTruthy(); expect(native.sender_address).toContain('مبنى 7');
    const pdf = await merchantWaybill(merchantId, orderId, true); expect(pdf.bytes.byteLength).toBeGreaterThan(1000); await writeFile('/tmp/psl-return.pdf', Buffer.from(pdf.bytes));
  }, 180000);
});
