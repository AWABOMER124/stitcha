import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { updatePartnerCodSupport } from './partner-cod.service';
import { saveRegionalPrice } from './regional-pricing.service';
import { quotePlatformDelivery, acceptDeliveryQuote } from './delivery-operations.service';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { findOrderById } from '@/modules/fulfillment/repositories/fulfillment.repository';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Regional pricing tests require the isolated wasla_comms_test database');
const suffix = randomUUID().slice(0, 8);
const stateInput = { stateId: 'red-sea', cityId: 'all', districtId: 'all', baseFee: '100' };
let partnerId: string, merchantId: string, slug: string, productId: string, cityPriceId: string;
beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = `isolated-regional-pricing-${suffix}`;
  const merchant = await prisma.merchant.create({ data: { name: 'متجر اختبار التسعير', slug: `regional-${suffix}`, businessType: 'RETAIL', status: 'ACTIVE', branches: { create: { name: 'الفرع الرئيسي', isMain: true, address: 'عنوان استلام تجريبي' } } } });
  merchantId = merchant.id; slug = merchant.slug;
  const category = await prisma.category.create({ data: { merchantId, name: 'اختبار', slug: `regional-${suffix}` } });
  productId = (await prisma.product.create({ data: { merchantId, categoryId: category.id, name: 'منتج اختبار', slug: `regional-${suffix}`, price: 100 } })).id;
  partnerId = (await prisma.deliveryPartner.create({ data: { name: 'شريك اختبار التسعير', slug: `regional-${suffix}`, status: 'ACTIVE', appStatus: 'PUBLISHED', supportsCod: true,
    providerConfig: { create: { providerKey: 'PARTNER_HTTP_V1', integrationMode: 'APP_V1', clientId: `regional-${suffix}`, clientSecretHash: 'synthetic-test-hash', outboundWebhookUrl: 'https://regional-test.example/events', approvedOrigin: 'https://regional-test.example', webhookSigningSecret: encryptSecret('synthetic-regional-test-secret'), isActive: true } },
    merchantConnections: { create: { merchantId, scopes: ['shipping.read_write'], isActive: true } },
  } })).id;
});
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ providerReference: `REGIONAL-${suffix}` }), { status: 201, headers: { 'content-type': 'application/json' } }))); });

async function order(city: string, district: string, state: string | undefined = 'البحر الأحمر') {
  const created = await placeOrder(slug, placeOrderSchema.parse({ customerName: 'عميل تجريبي', customerPhone: '+249900000001', customerState: state, customerCity: city, customerDistrict: district, customerAddress: 'شارع الاختبار، مبنى 1', deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', deliveryAddressVersion: state ? '3' : '2', items: [{ productId, quantity: 1 }] }));
  return created.orderId;
}
describe('Regional pricing persistence and actual quote flow', () => {
  it('saves a state-wide fixed price atomically without geometry or distance charges', async () => {
    const price = await saveRegionalPrice(partnerId, stateInput);
    expect(price.serviceArea).toMatchObject({ state: 'البحر الأحمر', allCities: true, allDistricts: true, city: null, district: null, centerLat: null, centerLng: null, radiusKm: null });
    expect(Number(price.perKmFee)).toBe(0); expect(price.maxDistanceKm).toBeNull(); expect(Number(price.baseFee)).toBe(100);
  });
  it('saves city and district overrides and gives the most specific price precedence even when higher', async () => {
    cityPriceId = (await saveRegionalPrice(partnerId, { ...stateInput, cityId: 'port-sudan', baseFee: '180' })).id;
    await saveRegionalPrice(partnerId, { ...stateInput, cityId: 'port-sudan', districtId: 'deim-arab', baseFee: '250' });
    const id = await order('بورتسودان', 'ديم عرب');
    const quotes = await quotePlatformDelivery(id);
    expect(quotes).toHaveLength(1); expect(Number(quotes[0].fee)).toBe(250); expect(quotes[0].distanceKm).toBeNull();
    const received = await findOrderById(merchantId, id); expect(received?.delivery?.state).toBe('البحر الأحمر');
    await prisma.order.update({ where: { id }, data: { status: 'READY' } });
    await acceptDeliveryQuote(id, quotes[0].id);
    const request = vi.mocked(fetch).mock.calls[0]?.[1]; expect(request).toBeDefined();
    const body = JSON.parse(String(request!.body));
    expect(body.recipient).toMatchObject({ state: 'البحر الأحمر', city: 'بورتسودان', district: 'ديم عرب', address: 'شارع الاختبار، مبنى 1', location: null });
    expect(body.payment.codAmount).toBe(350);
  });
  it('applies a city-wide price to unlisted districts', async () => {
    const quotes = await quotePlatformDelivery(await order('بورتسودان', 'حي جديد غير مدرج'));
    expect(Number(quotes[0].fee)).toBe(180);
  });
  it('applies the state price to other listed and custom cities, without coordinates', async () => {
    for (const city of ['طوكر', 'مدينة اختبار جديدة']) {
      const quotes = await quotePlatformDelivery(await order(city, 'حي اختبار'));
      expect(quotes).toHaveLength(1); expect(Number(quotes[0].fee)).toBe(100);
    }
  });
  it('does not include another state or infer a state for an unknown legacy city', async () => {
    expect(await quotePlatformDelivery(await order('كسلا', 'الختمية', 'كسلا'))).toEqual([]);
    // Explicitly omit state for an old client; the fixture helper defaults only when undefined.
    const created = await placeOrder(slug, placeOrderSchema.parse({ customerName: 'عميل قديم', customerPhone: '+249900000002', customerCity: 'مدينة قديمة مجهولة', customerDistrict: 'حي اختبار', customerAddress: 'شارع الاختبار', deliveryMethod: 'MERCHANT_DELIVERY', items: [{ productId, quantity: 1 }] }));
    expect(await quotePlatformDelivery(created.orderId)).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
  it('prevents duplicate scopes and edits by another company without leaving orphan areas', async () => {
    const before = await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } });
    await expect(saveRegionalPrice(partnerId, stateInput)).rejects.toThrow('بالفعل');
    const other = await prisma.deliveryPartner.create({ data: { name: 'شريك آخر', slug: `other-regional-${suffix}` } });
    await expect(saveRegionalPrice(other.id, stateInput, cityPriceId)).rejects.toThrow('لا تتبع');
    expect(await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } })).toBe(before);
  });
  it('rejects a stale offered price after an edit and preserves any other rule sharing its old area', async () => {
    const id = await order('بورتسودان', 'حي جديد'); const [quote] = await quotePlatformDelivery(id);
    const previous = await prisma.deliveryPartnerPricingRule.findUniqueOrThrow({ where: { id: cityPriceId } });
    const shared = await prisma.deliveryPartnerPricingRule.create({ data: { partnerId, serviceAreaId: previous.serviceAreaId, baseFee: 1000, perKmFee: 1 } });
    const changed = await saveRegionalPrice(partnerId, { ...stateInput, cityId: 'port-sudan', baseFee: '190' }, cityPriceId);
    expect(changed.serviceAreaId).not.toBe(previous.serviceAreaId);
    expect((await prisma.deliveryPartnerPricingRule.findUniqueOrThrow({ where: { id: shared.id } })).serviceAreaId).toBe(previous.serviceAreaId);
    expect((await prisma.deliveryPartnerServiceArea.findUniqueOrThrow({ where: { id: previous.serviceAreaId! } })).isActive).toBe(true);
    await expect(acceptDeliveryQuote(id, quote.id)).rejects.toThrow('price or coverage changed'); expect(fetch).not.toHaveBeenCalled();
  });
  it('persists COD changes, hides new cash quotes, invalidates offered quotes and preserves existing shipments and app configuration', async () => {
    const before = await prisma.platformShipment.findMany({ where: { partnerId }, select: { id: true, status: true, fee: true } });
    const orderId = await order('بورتسودان', 'حي آخر');
    await updatePartnerCodSupport(partnerId, false);
    expect(await quotePlatformDelivery(orderId)).toEqual([]);
    expect((await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId } })).supportsCod).toBe(false);
    await updatePartnerCodSupport(partnerId, true);
    const [offered] = await quotePlatformDelivery(orderId); expect(offered).toBeDefined();
    await updatePartnerCodSupport(partnerId, false);
    expect((await prisma.deliveryQuote.findUniqueOrThrow({ where: { id: offered.id } })).status).toBe('CANCELLED');
    await updatePartnerCodSupport(partnerId, true);
    await expect(acceptDeliveryQuote(orderId, offered.id)).rejects.toThrow('no longer available');
    expect(await prisma.platformShipment.findMany({ where: { partnerId }, select: { id: true, status: true, fee: true } })).toEqual(before);
    const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true } });
    expect(partner.appStatus).toBe('PUBLISHED'); expect(partner.providerConfig?.isActive).toBe(true); expect(fetch).not.toHaveBeenCalled();
  });
  it('blocks carrier acceptance with a missing pickup address before changing order totals', async () => {
    const id = await order('بورتسودان', 'حي جديد'); const quotes = await quotePlatformDelivery(id); const quote = quotes.find(row => row.partnerId === partnerId)!;
    const before = await prisma.order.findUniqueOrThrow({ where: { id } });
    await prisma.branch.updateMany({ where: { merchantId }, data: { address: null } });
    try {
      await expect(acceptDeliveryQuote(id, quote.id)).rejects.toThrow('عنوان استلام');
      expect(await prisma.platformShipment.findUnique({ where: { orderId: id } })).toBeNull();
      expect(await prisma.order.findUniqueOrThrow({ where: { id } })).toEqual(before);
      expect(fetch).not.toHaveBeenCalled();
    } finally { await prisma.branch.updateMany({ where: { merchantId }, data: { address: 'عنوان استلام تجريبي' } }); }
  });
  it('enforces explicit wildcard boundaries in the database as well', async () => {
    await expect(prisma.deliveryPartnerServiceArea.create({ data: { partnerId, code: 'INVALID-ALL', name: 'نطاق غير صالح', allCities: true, allDistricts: true } })).rejects.toThrow();
  });
});
