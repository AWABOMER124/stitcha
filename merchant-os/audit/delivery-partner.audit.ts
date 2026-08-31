/** Real PostgreSQL + real local HTTP adapter; no production credentials or requests.
 * Assertions describe launch requirements, so failures document actual blockers.
 * Test data stays in the explicitly named local audit database for investigation.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { POST as register } from '@/app/api/auth/register-delivery-partner/route';
import { POST as webhook } from '@/app/api/webhooks/delivery-partners/[token]/route';
import { _resetRateLimitsForTests } from '@/lib/security/rate-limit';
import { acceptDeliveryQuote, quotePlatformDelivery } from '@/modules/delivery-partners/services/delivery-operations.service';
import { dispatchShipmentToPartner, handlePartnerWebhook } from '@/modules/delivery-partners/services/partner-integration.service';
import { processOutboxBatch } from '@/services/jobs/outbox.service';
import { deliveryPartnerJobHandlers } from '@/services/jobs/delivery-partner.jobs';

const database = new URL(process.env.DATABASE_URL ?? 'http://unset');
if (database.hostname !== '127.0.0.1' || database.port !== '55439' || database.pathname !== '/wasla_partner_audit') {
  throw new Error('Audit refuses any database except the dedicated loopback audit database.');
}
const app = 'http://127.0.0.1:3107';
const secret = 'local-fake-provider-secret';
const password = 'Local-Audit-Only-123!';
const run = randomUUID();
let server: Server;
let providerUrl: string;
let providerStatus = 200;
let calls: Array<{ key: string | undefined; authorization: string | undefined; path: string | undefined; body: Record<string, unknown> }> = [];
let merchantId: string;
let customerId: string;
let branchId: string;

beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = 'wasla-local-audit-encryption-not-production';
  process.env.DELIVERY_PARTNER_ALLOW_LOCAL_TEST = 'true';
  server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    calls.push({ key: req.headers['idempotency-key'] as string, authorization: req.headers.authorization, path: req.url, body });
    res.writeHead(providerStatus, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ providerReference: `LOCAL-${body.shipmentId}` }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No local mock address');
  providerUrl = `http://127.0.0.1:${address.port}`;
  const merchant = await prisma.merchant.create({ data: { name: 'AUDIT ONLY', slug: `audit-${run}`, businessType: 'RETAIL', status: 'ACTIVE' } });
  merchantId = merchant.id;
  customerId = (await prisma.customer.create({ data: { merchantId, name: 'Synthetic customer', phone: `audit-${run}` } })).id;
  branchId = (await prisma.branch.create({ data: { merchantId, name: 'Audit pickup', isMain: true, lat: 15.5, lng: 32.56, address: 'Synthetic pickup' } })).id;
});
beforeEach(() => { calls = []; providerStatus = 200; _resetRateLimitsForTests(); });
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

async function fixture() {
  const partner = await prisma.deliveryPartner.create({ data: {
    name: 'LOCAL AUDIT PARTNER', slug: `audit-${randomUUID()}`, status: 'ACTIVE', appStatus: 'PUBLISHED', supportsCod: true,
    providerConfig: { create: { providerKey: 'PARTNER_HTTP_V1', apiBaseUrl: providerUrl, credentials: encryptSecret(secret) } },
  }, include: { providerConfig: true } });
  await prisma.merchantDeliveryPartner.create({ data: { merchantId, partnerId: partner.id } });
  const area = await prisma.deliveryPartnerServiceArea.create({ data: { partnerId: partner.id, code: 'CENTRAL', name: 'Audit central', centerLat: 15.5, centerLng: 32.56, radiusKm: 10 } });
  const rule = await prisma.deliveryPartnerPricingRule.create({ data: { partnerId: partner.id, serviceAreaId: area.id, baseFee: 500, perKmFee: 100, minimumFee: 700, maximumFee: 1500, maxDistanceKm: 50 } });
  const order = await prisma.order.create({ data: {
    merchantId, customerId, branchId, orderNumber: `AUD-${randomUUID()}`, status: 'READY', subtotal: 1000, total: 1000,
    deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', customerName: 'Synthetic customer', customerPhone: 'audit-only', customerAddress: 'Synthetic dropoff',
    delivery: { create: { type: 'MERCHANT_DELIVERY', lat: 15.51, lng: 32.56 } },
  } });
  // Other fixtures are inactive connections, keeping quote tests independent.
  await prisma.merchantDeliveryPartner.updateMany({ where: { merchantId, partnerId: { not: partner.id } }, data: { isActive: false } });
  return { partner, area, rule, order };
}
async function shipped() {
  const f = await fixture();
  const quotes = await quotePlatformDelivery(f.order.id);
  expect(quotes).toHaveLength(1);
  const shipment = await acceptDeliveryQuote(f.order.id, quotes[0].id);
  return { ...f, shipment, reference: `LOCAL-${shipment.id}` };
}
async function event(f: Awaited<ReturnType<typeof shipped>>, status: string) {
  const raw = JSON.stringify({ providerReference: f.reference, status });
  return handlePartnerWebhook(f.partner.providerConfig!.webhookToken, raw, createHmac('sha256', secret).update(raw).digest('hex'));
}
const registration = (overrides: Record<string, unknown> = {}) => ({ companyName: 'شركة فحص محلية', ownerName: 'Audit Owner', email: `audit-${randomUUID()}@example.invalid`, phone: `2499${Date.now().toString().slice(-8)}`, password, ...overrides });
const request = (body: unknown) => new Request(`${app}/api/auth/register-delivery-partner`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': '127.0.0.9' }, body: JSON.stringify(body) });

describe('Registration acceptance (real route and database)', () => {
  it('R01 creates pending partner, draft app and owner membership', async () => {
    const data = registration();
    const response = await register(request(data));
    expect(response.status).toBe(201);
    const result = await response.json();
    const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: result.partner.id }, include: { users: { include: { user: true } } } });
    expect(partner).toMatchObject({ status: 'PENDING', appStatus: 'DRAFT', supportsCod: false });
    expect(partner.users[0]).toMatchObject({ isOwner: true, role: 'DELIVERY_PARTNER_OWNER' });
    expect(partner.users[0].user.passwordHash).not.toBe(password);
    expect((await register(request(data))).status).toBe(409);
  });
  it('R02 rejects short passwords and privilege injection', async () => {
    expect((await register(request(registration({ password: 'short' })))).status).toBe(400);
    expect((await register(request(registration({ role: 'PLATFORM_ADMIN' })))).status).toBe(400);
  });
  it('R03 rate limits repeated registration attempts', async () => {
    for (let n = 0; n < 5; n++) expect((await register(request({}))).status).toBe(400);
    expect((await register(request({}))).status).toBe(429);
  });
  it('R04 rejects alphabetic phone numbers', async () => {
    const alphabeticPhone = randomUUID().replace(/[0-9-]/g, 'x').slice(0, 20);
    expect((await register(request(registration({ phone: alphabeticPhone })))).status).toBe(400);
  });
});

describe('Coverage, quotes and dispatch acceptance (real database and loopback provider)', () => {
  it('Q01 returns minimum-bounded fee and expires superseded quotes', async () => {
    const f = await fixture();
    const first = await quotePlatformDelivery(f.order.id);
    expect(first).toHaveLength(1);
    expect(Number(first[0].fee)).toBe(700);
    await quotePlatformDelivery(f.order.id);
    expect((await prisma.deliveryQuote.findUniqueOrThrow({ where: { id: first[0].id } })).status).toBe('EXPIRED');
  });
  it('Q02 excludes out-of-area destinations and disconnected merchants', async () => {
    const f = await fixture();
    await prisma.delivery.update({ where: { orderId: f.order.id }, data: { lat: 16.5 } });
    expect(await quotePlatformDelivery(f.order.id)).toHaveLength(0);
    await prisma.delivery.update({ where: { orderId: f.order.id }, data: { lat: 15.51 } });
    await prisma.merchantDeliveryPartner.updateMany({ where: { partnerId: f.partner.id }, data: { isActive: false } });
    expect(await quotePlatformDelivery(f.order.id)).toHaveLength(0);
  });
  it('Q03 creates one shipment, correct COD amount and authorized HTTP payload', async () => {
    const f = await shipped();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ key: f.shipment.id, authorization: `Bearer ${secret}`, path: '/shipments', body: { codAmount: 1700, currency: 'SDG' } });
    expect(calls[0].body.pickup).toMatchObject({ lat: 15.5, lng: 32.56 });
    expect(calls[0].body.dropoff).toMatchObject({ lat: 15.51, lng: 32.56 });
    expect(Number((await prisma.codCollection.findUniqueOrThrow({ where: { shipmentId: f.shipment.id } })).expectedAmount)).toBe(1700);
    await expect(acceptDeliveryQuote(f.order.id, f.shipment.quoteId!)).rejects.toThrow();
  });
  it('Q04 prevents concurrent acceptance from creating duplicate shipments', async () => {
    const f = await fixture();
    const [quote] = await quotePlatformDelivery(f.order.id);
    const results = await Promise.allSettled([acceptDeliveryQuote(f.order.id, quote.id), acceptDeliveryQuote(f.order.id, quote.id)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.platformShipment.count({ where: { orderId: f.order.id } })).toBe(1);
  });
  it('Q05 rejects expired quotes and unsupported noncash payment', async () => {
    const f = await fixture();
    const [quote] = await quotePlatformDelivery(f.order.id);
    await prisma.deliveryQuote.update({ where: { id: quote.id }, data: { expiresAt: new Date(0) } });
    await expect(acceptDeliveryQuote(f.order.id, quote.id)).rejects.toThrow();
    const [fresh] = await quotePlatformDelivery(f.order.id);
    await prisma.order.update({ where: { id: f.order.id }, data: { paymentMethod: 'MANUAL_TRANSFER' } });
    await expect(acceptDeliveryQuote(f.order.id, fresh.id)).rejects.toThrow(/cash on delivery only/);
  });
  it('Q06 rechecks partner suspension when accepting an existing quote', async () => {
    const f = await fixture(); const [quote] = await quotePlatformDelivery(f.order.id);
    await prisma.deliveryPartner.update({ where: { id: f.partner.id }, data: { status: 'SUSPENDED', isActive: false } });
    await expect(acceptDeliveryQuote(f.order.id, quote.id)).rejects.toThrow();
  });
  it('Q07 rejects a quote after its order was cancelled', async () => {
    const f = await fixture(); const [quote] = await quotePlatformDelivery(f.order.id);
    await prisma.order.update({ where: { id: f.order.id }, data: { status: 'CANCELLED' } });
    await expect(acceptDeliveryQuote(f.order.id, quote.id)).rejects.toThrow();
  });
  it('Q08 durably queues a failed provider dispatch for retry', async () => {
    const f = await fixture(); const [quote] = await quotePlatformDelivery(f.order.id);
    providerStatus = 503;
    const before = await prisma.outboxJob.count();
    const shipment = await acceptDeliveryQuote(f.order.id, quote.id);
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: shipment.id } })).providerReference).toBeNull();
    expect(await prisma.outboxJob.count()).toBeGreaterThan(before);
  });
  it('Q09 fails closed when no active provider configuration exists', async () => {
    const f = await fixture(); const [quote] = await quotePlatformDelivery(f.order.id);
    await prisma.deliveryPartnerProviderConfig.update({ where: { partnerId: f.partner.id }, data: { isActive: false } });
    await expect(acceptDeliveryQuote(f.order.id, quote.id)).rejects.toThrow();
  });
  it('Q10 preserves simulator reference on repeated dispatch', async () => {
    const f = await shipped();
    await prisma.deliveryPartnerProviderConfig.update({ where: { partnerId: f.partner.id }, data: { providerKey: 'TEST_SIMULATOR' } });
    const first = await dispatchShipmentToPartner(f.shipment.id);
    expect(await dispatchShipmentToPartner(f.shipment.id)).toEqual(first);
  });
  it('Q11 sends the main-branch pickup used to price a branchless order', async () => {
    const f = await fixture();
    await prisma.order.update({ where: { id: f.order.id }, data: { branchId: null } });
    const [quote] = await quotePlatformDelivery(f.order.id);
    await acceptDeliveryQuote(f.order.id, quote.id);
    expect(calls[0].body.pickup).toMatchObject({ lat: 15.5, lng: 32.56 });
  });
  it('Q12 retries a failed provider through the durable worker and completes without duplicate dispatch', async () => {
    const f = await fixture(); const [quote] = await quotePlatformDelivery(f.order.id);
    providerStatus = 503;
    const shipment = await acceptDeliveryQuote(f.order.id, quote.id);
    const key = `delivery:dispatch:${shipment.id}`;
    // A historical worker clock isolates this job from all other audit fixtures.
    await prisma.outboxJob.update({ where: { idempotencyKey: key }, data: { availableAt: new Date(0) } });
    const now = new Date('2000-01-01T00:00:00Z');
    expect((await processOutboxBatch({ workerId: 'audit-retry', handlers: deliveryPartnerJobHandlers, batchSize: 1, now, retryBaseDelayMs: 1 })).retried).toBe(1);
    providerStatus = 200;
    expect((await processOutboxBatch({ workerId: 'audit-recover', handlers: deliveryPartnerJobHandlers, batchSize: 1, now: new Date(now.getTime() + 100) })).completed).toBe(1);
    expect((await prisma.outboxJob.findUniqueOrThrow({ where: { idempotencyKey: key } })).status).toBe('COMPLETED');
    const count = calls.length;
    await dispatchShipmentToPartner(shipment.id);
    expect(calls).toHaveLength(count);
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: shipment.id } })).providerReference).toBe(`LOCAL-${shipment.id}`);
  });
});

describe('Webhook acceptance (real order state transitions)', () => {
  it('W01 rejects invalid HMAC without changing shipment', async () => {
    const f = await shipped();
    await expect(handlePartnerWebhook(f.partner.providerConfig!.webhookToken, JSON.stringify({ providerReference: f.reference, status: 'DELIVERED' }), 'invalid')).rejects.toThrow(/signature/);
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } })).status).toBe('REQUESTED');
  });
  it('W02 reflects valid pickup and delivery to the merchant order', async () => {
    const f = await shipped();
    for (const status of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) await event(f, status);
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } })).status).toBe('DELIVERED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe('DELIVERED');
  });
  it('W03 prevents a late event regressing a delivered shipment', async () => {
    const f = await shipped();
    for (const status of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'ASSIGNED']) await event(f, status);
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } })).status).toBe('DELIVERED');
  });
  it('W04 deduplicates repeated webhook events', async () => {
    const f = await shipped(); await event(f, 'ASSIGNED'); await event(f, 'ASSIGNED');
    expect(await prisma.deliveryEvent.count({ where: { shipmentId: f.shipment.id, status: 'ASSIGNED' } })).toBe(1);
  });
  it('W05 does not silently mark shipment delivered while order remains NEW', async () => {
    const f = await shipped();
    await prisma.order.update({ where: { id: f.order.id }, data: { status: 'NEW' } });
    await event(f, 'DELIVERED').catch(() => undefined);
    const shipment = await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
    expect(shipment.status === 'DELIVERED' && order.status !== 'DELIVERED').toBe(false);
  });
  it('W06 refuses state mutation for a suspended partner', async () => {
    const f = await shipped();
    await prisma.deliveryPartner.update({ where: { id: f.partner.id }, data: { status: 'SUSPENDED', isActive: false } });
    await expect(event(f, 'ASSIGNED')).rejects.toThrow();
  });
  it('W07 prevents cross-partner reference mutation', async () => {
    const f = await shipped(); const other = await fixture();
    const raw = JSON.stringify({ providerReference: f.reference, status: 'DELIVERED' });
    await expect(handlePartnerWebhook(other.partner.providerConfig!.webhookToken, raw, createHmac('sha256', secret).update(raw).digest('hex'))).rejects.toThrow();
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } })).status).toBe('REQUESTED');
  });
  it('W08 returns a failure for an unknown shipment reference', async () => {
    const f = await shipped(); const raw = JSON.stringify({ providerReference: 'unknown-reference', status: 'DELIVERED' });
    const response = await webhook(new Request(`${app}/api/webhooks/delivery-partners/${f.partner.providerConfig!.webhookToken}`, { method: 'POST', body: raw, headers: { 'x-wasla-signature': createHmac('sha256', secret).update(raw).digest('hex') } }), { params: Promise.resolve({ token: f.partner.providerConfig!.webhookToken }) });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
  it('W09 accepts signed HTTP webhooks and reflects delivery end-to-end locally', async () => {
    const f = await shipped();
    for (const status of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
      const body = JSON.stringify({ providerReference: f.reference, status });
      const response = await fetch(`${app}/api/webhooks/delivery-partners/${f.partner.providerConfig!.webhookToken}`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-wasla-signature': createHmac('sha256', secret).update(body).digest('hex') } });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
    }
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe('DELIVERED');
  });
  it('W10 serializes concurrent duplicate events into one state history entry', async () => {
    const f = await shipped();
    await Promise.all([event(f, 'ASSIGNED'), event(f, 'ASSIGNED'), event(f, 'ASSIGNED')]);
    expect(await prisma.deliveryEvent.count({ where: { shipmentId: f.shipment.id, status: 'ASSIGNED' } })).toBe(1);
  });
  it('W11 rolls back both event and shipment when order is not ready', async () => {
    const f = await shipped();
    await prisma.order.update({ where: { id: f.order.id }, data: { status: 'NEW' } });
    await expect(event(f, 'PICKED_UP')).rejects.toThrow();
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: f.shipment.id } })).status).toBe('REQUESTED');
    expect(await prisma.deliveryEvent.count({ where: { shipmentId: f.shipment.id, status: 'PICKED_UP' } })).toBe(0);
  });
});

describe('Portal HTTP acceptance (actual local Next server)', () => {
  let cookie = new Map<string, string>();
  let partnerId: string;
  const data = registration({ phone: `2498${Date.now().toString().slice(-8)}` });
  async function http(path: string, init: RequestInit = {}) {
    const response = await fetch(app + path, { ...init, redirect: 'manual', headers: { ...Object.fromEntries(new Headers(init.headers)), cookie: [...cookie].map(([k,v]) => `${k}=${v}`).join('; ') } });
    for (const entry of response.headers.getSetCookie()) { const pair = entry.split(';')[0]; const split = pair.indexOf('='); cookie.set(pair.slice(0, split), pair.slice(split + 1)); }
    return response;
  }
  async function formAction(path: string, fieldName: string, values: Record<string, string>) {
    const html = await (await http(path)).text();
    const formHtml = (html.match(/<form\b[\s\S]*?<\/form>/g) ?? []).find(form => form.includes(`name="${fieldName}"`));
    const actionName = formHtml?.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    expect(actionName).toBeDefined();
    const form = new FormData(); form.set(actionName!, '');
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return http(path, { method: 'POST', headers: { origin: app }, body: form });
  }
  async function login(email: string) {
    cookie = new Map();
    const csrf = await (await http('/api/auth/csrf')).json();
    await http('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-auth-return-redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: app + '/partner' }) });
    return (await http('/api/auth/session')).json();
  }
  beforeAll(async () => {
    const response = await fetch(app + '/api/auth/register-delivery-partner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    expect(response.status).toBe(201); partnerId = (await response.json()).partner.id;
    const csrf = await (await http('/api/auth/csrf')).json();
    await http('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-auth-return-redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: data.email, password, callbackUrl: app + '/partner' }) });
    const session = await (await http('/api/auth/session')).json();
    expect(session.user?.deliveryPartnerId).toBe(partnerId);
  });
  it('U01 logs in the pending owner and serves dashboard/settings/shipments', async () => {
    for (const path of ['/partner', '/partner/settings', '/partner/shipments']) expect((await http(path)).status).toBe(200);
  });
  it('U02 serves a usable regions/pricing page', async () => {
    const response = await http('/partner/coverage');
    expect(response.status).toBe(200);
    // Inspect the rendered heading, not the embedded fallback definition in RSC.
    const html = await response.text();
    expect(html).toMatch(/<h1[^>]*>التغطية والأسعار<\/h1>/);
    expect(html).toContain('name="serviceAreaId"');
    expect(html).toContain('name="stateId"');
    expect(html).toContain('name="cityId"');
    expect(html).toContain('name="districtId"');
    expect(html).toContain('البحر الأحمر');
    expect(html).toContain('وسط دارفور');
  });
  it('U03 renders application name as text, not URL', async () => {
    const html = await (await http('/partner/settings')).text();
    const input = (html.match(/<input\b[^>]*>/g) ?? []).find(tag => tag.includes('name="appName"'));
    expect(input).toBeDefined(); expect(input).not.toContain('type="url"');
  });
  it('U06 saves encrypted integration config and submits application through the real server action', async () => {
    // Verification itself is tested in partner-portal.audit.ts; this case covers submission.
    await prisma.user.update({ where: { email: data.email }, data: { emailVerified: new Date() } });
    const html = await (await http('/partner/settings')).text();
    const actionName = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    expect(actionName).toBeDefined();
    const form = new FormData();
    form.set(actionName!, '');
    form.set('appName', 'شركة الفحص للتوصيل');
    form.set('apiBaseUrl', providerUrl);
    form.set('apiSecret', secret);
    form.set('intent', 'submit');
    const response = await http('/partner/settings', { method: 'POST', headers: { origin: app }, body: form });
    expect(response.status).toBeLessThan(400);
    const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true } });
    expect(partner.appStatus).toBe('SUBMITTED');
    expect(partner.providerConfig?.credentials).toBeTruthy();
    expect(partner.providerConfig?.credentials).not.toBe(secret);
    expect(partner.providerConfig?.apiBaseUrl).toBe(providerUrl);
  });
  it('C01 adds a region and pricing rule using actual portal server actions', async () => {
    await formAction('/partner/coverage', 'code', { name: 'Audit district', code: 'AUDIT-CENTRAL', city: 'Khartoum', etaMin: '30', etaMax: '60', centerLat: '15.5', centerLng: '32.56', radiusKm: '10' });
    const area = await prisma.deliveryPartnerServiceArea.findUniqueOrThrow({ where: { partnerId_code: { partnerId, code: 'AUDIT-CENTRAL' } } });
    expect(area).toMatchObject({ name: 'Audit district', estimatedMinutesMin: 30, estimatedMinutesMax: 60 });
    await formAction('/partner/coverage', 'baseFee', { serviceAreaId: area.id, baseFee: '500', perKmFee: '100', minimumFee: '700', maximumFee: '1500', maxDistanceKm: '10' });
    const prices = await prisma.deliveryPartnerPricingRule.findMany({ where: { partnerId, serviceAreaId: area.id } });
    expect(prices).toHaveLength(1); expect(Number(prices[0].baseFee)).toBe(500);
  });
  it('C02 captures geographical boundaries when creating a region', async () => {
    await formAction('/partner/coverage', 'code', { name: 'Audit mapped district', code: 'AUDIT-GEO', city: 'Khartoum', centerLat: '15.5', centerLng: '32.56', radiusKm: '10' });
    const area = await prisma.deliveryPartnerServiceArea.findUniqueOrThrow({ where: { partnerId_code: { partnerId, code: 'AUDIT-GEO' } } });
    expect(area).toMatchObject({ centerLat: 15.5, centerLng: 32.56, radiusKm: 10 });
  });
  it('C03 rejects negative per-kilometre pricing', async () => {
    const before = await prisma.deliveryPartnerPricingRule.count({ where: { partnerId } });
    await formAction('/partner/coverage', 'baseFee', { baseFee: '500', perKmFee: '-100' });
    expect(await prisma.deliveryPartnerPricingRule.count({ where: { partnerId } })).toBe(before);
  });
  it('C04 rejects linking a price to another partners service area', async () => {
    const other = await fixture();
    await formAction('/partner/coverage', 'baseFee', { serviceAreaId: other.area.id, baseFee: '500' });
    expect(await prisma.deliveryPartnerPricingRule.count({ where: { partnerId, serviceAreaId: other.area.id } })).toBe(0);
  });
  it('C05 saves a Sudan directory district with canonical labels through the real action', async () => {
    await formAction('/partner/coverage', 'code', { locationMode: 'directory', stateId: 'red-sea', cityId: 'port-sudan', districtId: 'deim-arab',
      name: 'Untrusted label', city: 'Wrong city', code: 'AUDIT-SUDAN', centerLat: '19.61', centerLng: '37.21', radiusKm: '1.5' });
    const area = await prisma.deliveryPartnerServiceArea.findUniqueOrThrow({ where: { partnerId_code: { partnerId, code: 'AUDIT-SUDAN' } } });
    expect(area).toMatchObject({ name: 'ديم عرب', city: 'بورتسودان', centerLat: 19.61, centerLng: 37.21, radiusKm: 1.5 });
    expect(await prisma.deliveryPartnerPricingRule.count({ where: { serviceAreaId: area.id } })).toBe(0);
  });
  it('C06 rejects mismatched state/city and city/district with no database writes', async () => {
    const before = await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } });
    for (const selection of [{ stateId: 'kassala', districtId: 'deim-arab' }, { stateId: 'red-sea', districtId: 'burri' }]) {
      const response = await formAction('/partner/coverage', 'code', { locationMode: 'directory', cityId: 'port-sudan', ...selection,
        name: 'Invalid district', code: 'AUDIT-BAD-SUDAN', centerLat: '19.61', centerLng: '37.21', radiusKm: '1.5' });
      expect(response.headers.get('location')).toContain('error=location');
    }
    expect(await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } })).toBe(before);
  });
  it('C07 supports a custom district in a listed city without losing its city', async () => {
    await formAction('/partner/coverage', 'code', { locationMode: 'directory', stateId: 'gezira', cityId: 'wad-madani', districtId: '',
      name: 'نطاق اختبار محلي', code: 'AUDIT-CUSTOM-DISTRICT', centerLat: '14.40', centerLng: '33.52', radiusKm: '2' });
    expect(await prisma.deliveryPartnerServiceArea.findUniqueOrThrow({ where: { partnerId_code: { partnerId, code: 'AUDIT-CUSTOM-DISTRICT' } } }))
      .toMatchObject({ city: 'ود مدني', name: 'نطاق اختبار محلي' });
  });
  it('C08 directory selection alone cannot create a region without real geometry', async () => {
    const before = await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } });
    await formAction('/partner/coverage', 'code', { locationMode: 'directory', stateId: 'red-sea', cityId: 'port-sudan', districtId: 'deim-arab', code: 'AUDIT-NO-GEO' });
    expect(await prisma.deliveryPartnerServiceArea.count({ where: { partnerId } })).toBe(before);
  });
  it('A01 approves/publishes a submitted partner and enables COD through admin actions', async () => {
    const ownerCookies = cookie;
    try {
      const owner = await prisma.user.findUniqueOrThrow({ where: { email: data.email } });
      const admin = await prisma.user.create({ data: { name: 'Synthetic audit admin', email: `admin-${run}@example.invalid`, passwordHash: owner.passwordHash, role: 'PLATFORM_OWNER', platformAccessEnabled: true } });
      expect((await login(admin.email!)).user?.role).toBe('PLATFORM_OWNER');
      for (const intent of ['activate', 'enable-cod', 'publish']) await formAction('/admin/delivery-partners', 'id', { id: partnerId, intent });
      expect(await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId } })).toMatchObject({ status: 'ACTIVE', appStatus: 'PUBLISHED', supportsCod: true });
    } finally { cookie = ownerCookies; }
  });
  it('A02 enables and disables a published partner through the merchant marketplace', async () => {
    const ownerCookies = cookie;
    try {
      const owner = await prisma.user.findUniqueOrThrow({ where: { email: data.email } });
      const merchantUser = await prisma.user.create({ data: { name: 'Synthetic audit merchant', email: `merchant-${run}@example.invalid`, passwordHash: owner.passwordHash, role: 'MERCHANT_OWNER', merchantUsers: { create: { merchantId, role: 'MERCHANT_OWNER', isOwner: true } } } });
      expect((await login(merchantUser.email!)).user?.merchantId).toBe(merchantId);
      for (const enabled of ['true', 'false']) {
        await formAction('/dashboard/delivery/partners', 'partnerId', { partnerId, enabled });
        expect((await prisma.merchantDeliveryPartner.findUniqueOrThrow({ where: { merchantId_partnerId: { merchantId, partnerId } } })).isActive).toBe(enabled === 'true');
      }
    } finally { cookie = ownerCookies; }
  });
  it('S01 updates shipment through partner forms and mirrors merchant order delivery', async () => {
    const f = await fixture();
    const shipment = await prisma.platformShipment.create({ data: { partnerId, orderId: f.order.id, trackingCode: `AUD-${randomUUID()}`, fee: 700 } });
    for (const status of ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) await formAction('/partner/shipments', 'id', { id: shipment.id, status });
    expect((await prisma.platformShipment.findUniqueOrThrow({ where: { id: shipment.id } })).status).toBe('DELIVERED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe('DELIVERED');
  });
  it('U04 revokes an existing partner session after suspension', async () => {
    await prisma.deliveryPartner.update({ where: { id: partnerId }, data: { status: 'SUSPENDED', isActive: false } });
    expect((await http('/partner/settings')).status).not.toBe(200);
  });
  it('U05 rejects a new login after suspension', async () => {
    cookie = new Map();
    const csrf = await (await http('/api/auth/csrf')).json();
    await http('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-auth-return-redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: data.email, password, callbackUrl: app + '/partner' }) });
    const session = await (await http('/api/auth/session')).json();
    expect(session?.user?.deliveryPartnerId).toBeUndefined();
  });
});
