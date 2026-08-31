import { randomUUID, createHmac, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/db/prisma';
import { decryptSecret } from '@/lib/crypto/secret';
import { EmailProvider } from '@/services/notifications/providers/email.provider';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';
import { sendPartnerCode, verifyPartnerCode, changePartnerPassword, partnerCodeHash } from '@/modules/delivery-partners/services/partner-security.service';
import { createSandboxStore, createSandboxShipment, updateSandboxShipment, authenticateSandbox, rotateSandboxKey, sandboxWebhook } from '@/modules/delivery-partners/services/partner-sandbox.service';

const db = new URL(process.env.DATABASE_URL ?? 'http://unset');
if (db.hostname !== '127.0.0.1' || db.port !== '55439' || db.pathname !== '/wasla_partner_audit') throw new Error('Dedicated local audit database required');
const app = 'http://127.0.0.1:3107';
const password = 'Local-Audit-Only-123!';
let sentCode = '';
let passwordHash: string;
let owner: Awaited<ReturnType<typeof fixture>>;
let cookie = new Map<string, string>();
async function fixture() {
  const unique = randomUUID();
  const partner = await prisma.deliveryPartner.create({ data: { name: 'PORTAL AUDIT ONLY', slug: `portal-${unique}`, status: 'PENDING' } });
  const user = await prisma.user.create({ data: { email: `portal-${unique}@example.invalid`, phone: `2499${unique.replace(/\D/g, '').padEnd(8, '0').slice(0, 8)}`, passwordHash, role: 'DELIVERY_PARTNER_OWNER', deliveryPartnerUsers: { create: { partnerId: partner.id, role: 'DELIVERY_PARTNER_OWNER', isOwner: true } } } });
  return { partner, user };
}
beforeAll(async () => {
  vi.stubEnv('AUTH_SECRET', 'wasla-local-audit-auth-not-production-20260831');
  vi.stubEnv('SECRETS_ENCRYPTION_KEY', 'wasla-local-audit-encryption-not-production');
  vi.stubEnv('RESEND_API_KEY', 'local-mock-never-sent'); vi.stubEnv('EMAIL_FROM', 'test@example.invalid');
  vi.stubEnv('PLATFORM_WHATSAPP_PROVIDER', 'meta');
  for (const key of ['WHATSAPP_CLOUD_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_GRAPH_API_VERSION', 'WHATSAPP_OTP_TEMPLATE_NAME']) vi.stubEnv(key, 'local-mock-never-sent');
  vi.spyOn(EmailProvider.prototype, 'send').mockImplementation(async payload => { sentCode = payload.body.match(/\d{6}/)![0]; });
  vi.spyOn(WhatsAppProvider.prototype, 'send').mockImplementation(async payload => { sentCode = String(payload.metadata?.code); });
  passwordHash = await bcrypt.hash(password, 12); owner = await fixture();
});
afterAll(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await prisma.$disconnect(); });

async function http(path: string, init: RequestInit = {}) {
  const response = await fetch(app + path, { ...init, redirect: 'manual', headers: { ...Object.fromEntries(new Headers(init.headers)), cookie: [...cookie].map(([key,value]) => `${key}=${value}`).join('; ') } });
  for (const entry of response.headers.getSetCookie()) { const pair = entry.split(';')[0]; const index = pair.indexOf('='); cookie.set(pair.slice(0,index), pair.slice(index+1)); }
  return response;
}
async function login(email: string, suppliedPassword = password) {
  cookie = new Map(); const csrf = await (await http('/api/auth/csrf')).json();
  await http('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: suppliedPassword, callbackUrl: app + '/partner' }) });
}
async function formAction(path: string, field: string, values: Record<string, string>) {
  const html = await (await http(path)).text();
  const formHtml = (html.match(/<form\b[\s\S]*?<\/form>/g) ?? []).find(form => form.includes(`name="${field}"`));
  const action = formHtml?.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1]; expect(action).toBeTruthy();
  const body = new FormData(); body.set(action!, ''); for (const [key,value] of Object.entries(values)) body.set(key,value);
  return http(path, { method: 'POST', headers: { origin: app }, body });
}
describe('Partner verification and session security', () => {
  it('P01 requires confirmation before application submission or sandbox creation', async () => {
    await login(owner.user.email);
    const submit = await formAction('/partner/settings', 'appName', { intent: 'submit', appName: 'Local audit app' });
    expect(submit.headers.get('location')).toContain('/partner/security');
    const sandbox = await formAction('/partner/sandbox', 'intent', { intent: 'create-store' });
    expect(sandbox.headers.get('location')).toContain('/partner/security');
    expect(await prisma.partnerSandboxStore.count({ where: { partnerId: owner.partner.id } })).toBe(0);
  });
  it('P02 emails a hashed single-use code and confirms the account', async () => {
    await sendPartnerCode(owner.user.id, 'EMAIL'); const code = sentCode;
    const row = await prisma.partnerVerificationChallenge.findFirstOrThrow({ where: { userId: owner.user.id } });
    expect(row.codeHash).not.toBe(code); expect(row.codeHash).toHaveLength(64);
    await verifyPartnerCode(owner.user.id, 'EMAIL', code);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } })).emailVerified).not.toBeNull();
    await expect(verifyPartnerCode(owner.user.id, 'EMAIL', code)).rejects.toThrow();
  });
  it('P03 confirms WhatsApp and limits resends across channels', async () => {
    const f = await fixture(); await sendPartnerCode(f.user.id, 'WHATSAPP'); const code = sentCode;
    await expect(sendPartnerCode(f.user.id, 'EMAIL')).rejects.toThrow();
    await verifyPartnerCode(f.user.id, 'WHATSAPP', code);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).phoneVerifiedAt).not.toBeNull();
  });
  it('P04 persists failed attempts, locks at five, and cannot reuse another account code', async () => {
    const f = await fixture(); await sendPartnerCode(f.user.id, 'EMAIL'); const code = sentCode;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let n = 0; n < 5; n++) await expect(verifyPartnerCode(f.user.id, 'EMAIL', wrong)).rejects.toThrow();
    await expect(verifyPartnerCode(f.user.id, 'EMAIL', code)).rejects.toThrow();
    const row = await prisma.partnerVerificationChallenge.findFirstOrThrow({ where: { userId: f.user.id } });
    expect(row.attempts).toBe(5);
    const other = await fixture(); await expect(verifyPartnerCode(other.user.id, 'EMAIL', code)).rejects.toThrow();
  });
  it('P05 rejects expired codes and concurrent double verification', async () => {
    const f = await fixture(); await sendPartnerCode(f.user.id, 'EMAIL'); const code = sentCode;
    const result = await Promise.allSettled([verifyPartnerCode(f.user.id, 'EMAIL', code), verifyPartnerCode(f.user.id, 'EMAIL', code)]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    const expired = await fixture(); await sendPartnerCode(expired.user.id, 'EMAIL');
    await prisma.partnerVerificationChallenge.updateMany({ where: { userId: expired.user.id }, data: { expiresAt: new Date(0) } });
    await expect(verifyPartnerCode(expired.user.id, 'EMAIL', sentCode)).rejects.toThrow();
  });
  it('P06 rejects wrong current password and revokes the old portal session after change', async () => {
    const f = await fixture(); await login(f.user.email);
    await expect(changePartnerPassword(f.user.id, 'wrong-password', 'New-Local-Test-123!')).rejects.toThrow();
    await changePartnerPassword(f.user.id, password, 'New-Local-Test-123!');
    expect((await http('/partner/security')).status).toBe(307);
    await login(f.user.email, 'New-Local-Test-123!'); expect((await http('/partner/security')).status).toBe(200);
    await login(owner.user.email);
  });
});
describe('Portal application and isolated sandbox', () => {
  it('P07 renders new portal pages and uploads a real image directly', async () => {
    await login(owner.user.email);
    for (const path of ['/partner/coverage', '/partner/settings', '/partner/docs', '/partner/security', '/partner/sandbox']) expect((await http(path)).status).toBe(200);
    const png = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#13c4a3' } }).png().toBuffer();
    const body = new FormData(); body.set('image', new File([new Uint8Array(png)], 'logo.png', { type: 'image/png' }));
    const response = await http('/api/partner/logo', { method: 'POST', headers: { origin: app }, body });
    expect(response.status).toBe(201); const result = await response.json();
    expect(result.url).toContain(`partner-${owner.partner.id}-logo`);
    expect((await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: owner.partner.id } })).appIcon).toBe(result.url);
    expect((await http(result.url)).status).toBe(200);
    const bad = new FormData(); bad.set('image', new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect((await http('/api/partner/logo', { method: 'POST', headers: { origin: app }, body: bad })).status).toBe(400);
    expect((await http('/api/partner/logo', { method: 'POST', headers: { origin: 'https://other.invalid' }, body: bad })).status).toBe(403);
  });
  it('P08 preserves a published app and logo when saving metadata', async () => {
    await prisma.deliveryPartner.update({ where: { id: owner.partner.id }, data: { appStatus: 'PUBLISHED' } });
    const before = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: owner.partner.id } });
    await formAction('/partner/settings', 'appName', { intent: 'save', appName: 'Updated audit name', appIcon: 'https://attacker.invalid/logo.svg' });
    const after = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: owner.partner.id } });
    expect(after.appStatus).toBe('PUBLISHED'); expect(after.appIcon).toBe(before.appIcon);
  });
  it('P09 creates one sandbox store via real action with no production merchant or order', async () => {
    const merchants = await prisma.merchant.count(); const orders = await prisma.order.count(); const shipments = await prisma.platformShipment.count();
    await formAction('/partner/sandbox', 'intent', { intent: 'create-store' });
    await createSandboxStore(owner.partner.id);
    expect(await prisma.partnerSandboxStore.count({ where: { partnerId: owner.partner.id } })).toBe(1);
    expect(await prisma.merchant.count()).toBe(merchants); expect(await prisma.order.count()).toBe(orders); expect(await prisma.platformShipment.count()).toBe(shipments);
  });
  it('P10 issues a sample label idempotently through HTTP API', async () => {
    const store = await createSandboxStore(owner.partner.id);
    const key = decryptSecret(store.apiKey); const idempotencyKey = randomUUID();
    const headers = { authorization: `Bearer ${key}`, 'idempotency-key': idempotencyKey };
    const results = await Promise.all([fetch(app + '/api/partner-sandbox/shipments', { method: 'POST', headers }), fetch(app + '/api/partner-sandbox/shipments', { method: 'POST', headers })]);
    expect(results.map(response => response.status)).toEqual([201,201]);
    const [one,two] = await Promise.all(results.map(response => response.json())); expect(one.providerReference).toBe(two.providerReference);
    const label = await http(one.labelPath); expect(label.status).toBe(200); expect(await label.text()).toContain('غير صالحة للشحن الفعلي');
  });
  it('P11 signed HTTP callbacks mirror status without touching production and duplicates are safe', async () => {
    const store = await createSandboxStore(owner.partner.id); const shipment = await createSandboxShipment(owner.partner.id, randomUUID());
    const raw = JSON.stringify({ providerReference: shipment.id, status: 'DELIVERED' });
    const headers = { 'x-wasla-signature': createHmac('sha256', decryptSecret(store.apiKey)).update(raw).digest('hex') };
    for (let n = 0; n < 2; n++) expect((await fetch(`${app}/api/partner-sandbox/webhooks/${store.webhookToken}`, { method: 'POST', headers, body: raw })).status).toBe(200);
    const updated = await prisma.partnerSandboxShipment.findUniqueOrThrow({ where: { id: shipment.id } }); expect(updated.orderStatus).toBe('DELIVERED'); expect(updated.events).toHaveLength(2);
    expect(await prisma.platformShipment.findUnique({ where: { id: shipment.id } })).toBeNull();
  });
  it('P12 prevents cross-partner access, production references and invalid signatures', async () => {
    const store = await createSandboxStore(owner.partner.id); const other = await fixture(); const otherStore = await createSandboxStore(other.partner.id);
    const shipment = await createSandboxShipment(owner.partner.id, randomUUID());
    await expect(updateSandboxShipment(other.partner.id, shipment.id, 'CANCELLED')).rejects.toThrow();
    const raw = JSON.stringify({ providerReference: shipment.id, status: 'ASSIGNED' });
    await expect(sandboxWebhook(store.webhookToken, raw, createHmac('sha256', decryptSecret(otherStore.apiKey)).update(raw).digest('hex'))).rejects.toThrow();
    await expect(updateSandboxShipment(owner.partner.id, 'production-shipment-id', 'CANCELLED')).rejects.toThrow();
    await login(other.user.email); expect((await http(`/partner/sandbox/labels/${shipment.id}`)).status).toBe(404); await login(owner.user.email);
  });
  it('P13 cancels through HTTP before pickup and rejects after pickup', async () => {
    const store = await createSandboxStore(owner.partner.id); const headers = { authorization: `Bearer ${decryptSecret(store.apiKey)}` };
    const shipment = await createSandboxShipment(owner.partner.id, randomUUID());
    const cancel = () => fetch(`${app}/api/partner-sandbox/shipments/${shipment.id}/cancel`, { method: 'POST', headers });
    expect((await cancel()).status).toBe(200); expect((await cancel()).status).toBe(200);
    expect((await prisma.partnerSandboxShipment.findUniqueOrThrow({ where: { id: shipment.id } })).orderStatus).toBe('READY');
    const picked = await createSandboxShipment(owner.partner.id, randomUUID()); await updateSandboxShipment(owner.partner.id, picked.id, 'PICKED_UP', true);
    expect((await fetch(`${app}/api/partner-sandbox/shipments/${picked.id}/cancel`, { method: 'POST', headers })).status).toBe(409);
  });
  it('P14 rotation revokes old keys and a suspended partner cannot use sandbox API', async () => {
    const f = await fixture(); const store = await createSandboxStore(f.partner.id); const oldKey = decryptSecret(store.apiKey);
    await rotateSandboxKey(f.partner.id); await expect(authenticateSandbox(oldKey)).rejects.toThrow();
    const updated = await prisma.partnerSandboxStore.findUniqueOrThrow({ where: { id: store.id } }); const key = decryptSecret(updated.apiKey);
    expect((await authenticateSandbox(key)).id).toBe(store.id);
    await prisma.deliveryPartner.update({ where: { id: f.partner.id }, data: { status: 'SUSPENDED' } }); await expect(authenticateSandbox(key)).rejects.toThrow();
  });
  it('P15 code hashing remains tied to recorded address if account details change', async () => {
    const f = await fixture(); const code = '123456';
    await prisma.partnerVerificationChallenge.create({ data: { userId: f.user.id, channel: 'EMAIL', target: 'old@example.invalid', codeHash: partnerCodeHash(f.user.id, 'EMAIL', 'old@example.invalid', code), expiresAt: new Date(Date.now()+600000) } });
    await expect(verifyPartnerCode(f.user.id, 'EMAIL', code)).rejects.toThrow();
  });
  it('P16 password recovery consumes a token once, revokes partner sessions and rejects oversized passwords', async () => {
    const f = await fixture(); await login(f.user.email);
    const token = randomUUID(); const next = 'Recovered-Audit-Password-123!';
    await prisma.passwordResetToken.create({ data: { userId: f.user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } });
    const reset = (value: string) => fetch(app + '/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password: value }) });
    expect((await reset('ع'.repeat(40))).status).toBe(400);
    const results = await Promise.all([reset(next), reset(next)]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    expect((await http('/partner/settings')).headers.get('location')).toContain('/login');
    await login(f.user.email, next); expect((await http('/partner/settings')).status).toBe(200);
  });
});
