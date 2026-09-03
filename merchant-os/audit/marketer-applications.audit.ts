import { randomInt, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/db/prisma';
import {
  listProductApplicationsForMerchant,
  reviewAcquisitionApplication,
  reviewProductApplication,
  submitMarketerApplication,
} from '@/modules/marketer-applications/marketer-applications.service';

const db = new URL(process.env.DATABASE_URL ?? 'http://unset');
if (db.hostname !== '127.0.0.1' || db.port !== '55439' || db.pathname !== '/wasla_partner_audit') throw new Error('Dedicated local audit database required');
let sequence = randomInt(10_000_000, 89_999_999);
const phone = () => `+2499${String(sequence++).slice(-8)}`;
const profile = () => ({ name: 'Audit Marketer', phone: phone(), email: `marketer-${randomUUID()}@example.invalid`, city: 'Khartoum', channels: ['WHATSAPP'], experience: 'Synthetic audit profile' });

async function merchant() {
  const id = randomUUID();
  return prisma.merchant.create({ data: { name: `MARKETER AUDIT ${id}`, slug: `marketer-audit-${id}`, businessType: 'RETAIL', status: 'ACTIVE' } });
}

beforeAll(() => vi.stubEnv('AUTH_SECRET', 'wasla-local-marketer-audit-not-production'));
afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect(); });

describe('public marketer applications', () => {
  it('M01 accepts one acquisition application and prevents duplicate pending submissions', async () => {
    const input = { type: 'MERCHANT_ACQUISITION' as const, ...profile() };
    const created = await submitMarketerApplication(input);
    expect(created.status).toBe('PENDING');
    await expect(submitMarketerApplication(input)).rejects.toThrow('قيد المراجعة');
  });

  it('M02 lets platform operations review only acquisition applications', async () => {
    const created = await submitMarketerApplication({ type: 'MERCHANT_ACQUISITION', ...profile() });
    const approved = await reviewAcquisitionApplication({ applicationId: created.id, reviewerId: 'audit-reviewer', decision: 'APPROVE' });
    expect(approved.status).toBe('APPROVED');
    await expect(reviewAcquisitionApplication({ applicationId: created.id, reviewerId: 'audit-reviewer', decision: 'APPROVE' })).rejects.toThrow('مسبقاً');
  });

  it('M03 requires an active store program and creates one tenant affiliate on approval', async () => {
    const store = await merchant();
    await prisma.storeAffiliateProgram.create({ data: { merchantId: store.id, isActive: true, commissionRate: 8, currency: 'SDG' } });
    const created = await submitMarketerApplication({ type: 'STOREFRONT_PRODUCTS', merchantId: store.id, ...profile() });
    const approved = await reviewProductApplication({ merchantId: store.id, applicationId: created.id, reviewerId: 'merchant-audit', decision: 'APPROVE' });
    expect(approved.status).toBe('APPROVED');
    expect(approved.affiliateId).toBeTruthy();
    expect(await prisma.storeAffiliate.count({ where: { id: approved.affiliateId!, merchantId: store.id } })).toBe(1);
  });

  it('M04 prevents another merchant from seeing or reviewing the application', async () => {
    const [owner, outsider] = await Promise.all([merchant(), merchant()]);
    await prisma.storeAffiliateProgram.create({ data: { merchantId: owner.id, isActive: true, commissionRate: 5, currency: 'SDG' } });
    const created = await submitMarketerApplication({ type: 'STOREFRONT_PRODUCTS', merchantId: owner.id, ...profile() });
    expect(await listProductApplicationsForMerchant(outsider.id)).toHaveLength(0);
    await expect(reviewProductApplication({ merchantId: outsider.id, applicationId: created.id, reviewerId: 'outsider', decision: 'APPROVE' })).rejects.toThrow('not found');
  });
});
