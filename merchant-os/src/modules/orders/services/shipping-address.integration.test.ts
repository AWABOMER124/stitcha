import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID, createHmac } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { placeOrder, placeOrderForAccount, getOrderHistoryForAccount } from '@/modules/storefront/services/storefront.service';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { findOrderById } from '@/modules/fulfillment/repositories/fulfillment.repository';
import { createOrderSchema, editOrderSchema } from '../schemas/orders.schemas';
import { createOrder, editOrder } from './orders.service';
import { quotePlatformDelivery, acceptDeliveryQuote } from '@/modules/delivery-partners/services/delivery-operations.service';
import { dispatchShipmentToPartner } from '@/modules/delivery-partners/services/partner-integration.service';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Shipping address tests require the isolated wasla_comms_test database');
const suffix = randomUUID().slice(0, 8), signingKey = 'isolated-address-test-signing-key';
const address = { deliveryAddressVersion: '2' as const, customerCity: 'بورتسودان', customerDistrict: 'ديم عرب', customerAddress: 'شارع الاختبار، مبنى 7', customerAddressDescription: 'قرب الميدان', deliveryLat: 19.61, deliveryLng: 37.21 };
let merchantId: string, slug: string, productId: string, partnerId: string, publicOrderId: string;
beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = `isolated-shipping-${suffix}-encryption-key`;
  const merchant = await prisma.merchant.create({ data: { name: 'متجر اختبار العنوان', slug: `address-${suffix}`, businessType: 'RETAIL', status: 'ACTIVE',
    branches: { create: { name: 'فرع الاختبار', isMain: true, lat: 19.6, lng: 37.2, address: 'عنوان الاستلام' } } } });
  merchantId = merchant.id; slug = merchant.slug;
  const category = await prisma.category.create({ data: { merchantId, name: 'اختبار', slug: `address-${suffix}` } });
  productId = (await prisma.product.create({ data: { merchantId, categoryId: category.id, name: 'صنف اختبار', slug: `address-${suffix}`, price: 100 } })).id;
  const partner = await prisma.deliveryPartner.create({ data: { name: 'شريك اختبار العنوان', slug: `address-${suffix}`, status: 'ACTIVE', appStatus: 'PUBLISHED', supportsCod: true,
    providerConfig: { create: { providerKey: 'PARTNER_HTTP_V1', integrationMode: 'APP_V1', clientId: `address-${suffix}`, clientSecretHash: 'isolated-test-only-hash', outboundWebhookUrl: 'https://address-test.example/events', approvedOrigin: 'https://address-test.example', webhookSigningSecret: encryptSecret(signingKey), isActive: true } },
    merchantConnections: { create: { merchantId, isActive: true, scopes: ['shipping.read_write'] } },
  } }); partnerId = partner.id;
  const area = await prisma.deliveryPartnerServiceArea.create({ data: { partnerId, name: 'نطاق اختبار', code: 'ADDRESS', city: 'بورتسودان', district: 'ديم عرب', centerLat: 19.6, centerLng: 37.2, radiusKm: 50 } });
  await prisma.deliveryPartnerPricingRule.create({ data: { partnerId, serviceAreaId: area.id, baseFee: 25, currency: 'SDG' } });
});
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ providerReference: `CARRIER-${suffix}` }), { status: 201, headers: { 'content-type': 'application/json' } }))); });
describe('Buyer to merchant to delivery partner address flow', () => {
  it('persists buyer fields and exposes them to the owning merchant', async () => {
    const created = await placeOrder(slug, placeOrderSchema.parse({ ...address, customerName: 'عميل اختبار', customerPhone: '+249900000001', deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', items: [{ productId, quantity: 2 }] }));
    publicOrderId = created.orderId;
    const received = await findOrderById(merchantId, publicOrderId);
    expect(received?.customerAddress).toBe(address.customerAddress);
    expect(received?.delivery).toMatchObject({ city: address.customerCity, area: address.customerDistrict, notes: address.customerAddressDescription, address: address.customerAddress });
    expect(await findOrderById('another-merchant', publicOrderId)).toBeNull();
  });
  it('quotes and accepts the shipment then sends the same complete signed address', async () => {
    await prisma.order.update({ where: { id: publicOrderId }, data: { status: 'READY' } });
    const quotes = await quotePlatformDelivery(publicOrderId); expect(quotes).toHaveLength(1);
    const shipment = await acceptDeliveryQuote(publicOrderId, quotes[0].id);
    const call = vi.mocked(fetch).mock.calls[0]; expect(call).toBeDefined();
    const request = call[1] as RequestInit, raw = String(request.body), body = JSON.parse(raw);
    expect(body.recipient).toMatchObject({ city: address.customerCity, district: address.customerDistrict, address: address.customerAddress, addressDescription: address.customerAddressDescription });
    expect(body.payment.codAmount).toBe(225);
    expect(new Headers(request.headers).get('x-wasla-signature')).toBe('sha256=' + createHmac('sha256', signingKey).update(raw).digest('hex'));
    await dispatchShipmentToPartner(shipment.id); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('prevents changes to delivery address fields after shipment creation', async () => {
    await expect(editOrder(merchantId, publicOrderId, editOrderSchema.parse({ customerName: 'عميل اختبار', customerPhone: '+249900000001', customerAddress: address.customerAddress, customerCity: 'كسلا', deliveryFee: 25 }))).rejects.toThrow('cannot change');
  });
  it('allows manual merchant orders and clears stale coordinates after an address change', async () => {
    const order = await createOrder(merchantId, createOrderSchema.parse({ ...address, customerName: 'عميل يدوي', customerPhone: '+249900000002', deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', items: [{ productId, quantity: 1 }] }));
    expect(order.delivery?.city).toBe(address.customerCity);
    const edited = await editOrder(merchantId, order.id, editOrderSchema.parse({ customerName: 'عميل يدوي', customerPhone: '+249900000002', customerCity: 'كسلا', customerDistrict: 'الختمية', customerAddress: 'عنوان معدل', customerAddressDescription: 'معلم معدل', deliveryFee: 0 }));
    expect(edited.delivery).toMatchObject({ city: 'كسلا', area: 'الختمية', notes: 'معلم معدل', lat: null, lng: null });
  });
  it('keeps structured addresses in the mobile API service response', async () => {
    const account = await prisma.customerAccount.create({ data: { name: 'عميل جوال اختبار', phone: `address-${suffix}`, passwordHash: 'isolated-test-only' } });
    const result = await placeOrderForAccount(account, { items: [{ productId, quantity: 1 }], address: address.customerAddress, city: address.customerCity, district: address.customerDistrict, addressDescription: address.customerAddressDescription, deliveryAddressVersion: '2' });
    expect(result).toMatchObject({ city: address.customerCity, district: address.customerDistrict, address_description: address.customerAddressDescription, address: address.customerAddress });
    expect(await getOrderHistoryForAccount(account.id)).toEqual(expect.arrayContaining([expect.objectContaining({ id: result.id, city: address.customerCity, district: address.customerDistrict, address_description: address.customerAddressDescription })]));
    await expect(placeOrderForAccount(account, { items: [{ productId, quantity: 1 }], city: address.customerCity, address: address.customerAddress, deliveryAddressVersion: '2' })).rejects.toMatchObject({ statusCode: 422 });
  });
  it('blocks legacy incomplete addresses before a shipping quote is issued', async () => {
    const order = await placeOrder(slug, placeOrderSchema.parse({ customerName: 'عميل قديم', customerPhone: '+249900000003', customerAddress: 'عنوان غير مفصل', deliveryLat: 19.61, deliveryLng: 37.21, deliveryMethod: 'MERCHANT_DELIVERY', items: [{ productId, quantity: 1 }] }));
    await expect(quotePlatformDelivery(order.orderId)).rejects.toThrow('المدينة'); expect(fetch).not.toHaveBeenCalled();
  });
});
