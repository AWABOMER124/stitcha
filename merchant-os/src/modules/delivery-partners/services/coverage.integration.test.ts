import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { savePartnerServiceArea, coverageGeometrySchema } from './coverage.service';
import { createDeliveryZone, updateDeliveryZone } from '@/modules/finance/repositories/finance.repository';
import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from '@/modules/finance/schemas/finance.schemas';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Coverage integration tests require the isolated wasla_comms_test database');
const suffix = randomUUID().slice(0, 8);
let partnerId: string, otherId: string, areaId: string;
const input = { addressVersion: '2', locationMode: 'directory', stateId: 'red-sea', cityId: 'port-sudan', districtId: 'deim-arab',
  name: 'نطاق اختبار', description: 'وصف نطاق الاختبار', code: 'test', centerLat: '19.6', centerLng: '37.2', radiusKm: '2', etaMin: '10', etaMax: '20' };
beforeAll(async () => {
  const partners = await Promise.all([0, 1].map(i => prisma.deliveryPartner.create({ data: { name: 'شريك اختبار المناطق', slug: `coverage-${suffix}-${i}` } })));
  [partnerId, otherId] = partners.map(p => p.id);
});
describe('Coverage persistence and isolation', () => {
  it('persists city, district, description and independent service name', async () => {
    const area = await savePartnerServiceArea(partnerId, input); areaId = area.id;
    expect(area).toMatchObject({ state: 'البحر الأحمر', city: 'بورتسودان', district: 'ديم عرب', description: 'وصف نطاق الاختبار', name: 'نطاق اختبار', code: 'TEST' });
  });
  it('updates the owned area without changing its pricing rule', async () => {
    const price = await prisma.deliveryPartnerPricingRule.create({ data: { partnerId, serviceAreaId: areaId, baseFee: 100 } });
    const changed = await savePartnerServiceArea(partnerId, { ...input, districtId: '', district: 'حي مخصص', description: 'وصف معدل' }, areaId);
    expect(changed.district).toBe('حي مخصص'); expect(changed.description).toBe('وصف معدل');
    expect(Number((await prisma.deliveryPartnerPricingRule.findUniqueOrThrow({ where: { id: price.id } })).baseFee)).toBe(100);
  });
  it('rejects another partner editing the area and scopes code uniqueness', async () => {
    await expect(savePartnerServiceArea(otherId, input, areaId)).rejects.toThrow('لا تتبع');
    await expect(savePartnerServiceArea(partnerId, input)).rejects.toThrow('مستخدم');
    await expect(savePartnerServiceArea(otherId, input)).resolves.toMatchObject({ partnerId: otherId, code: 'TEST' });
  });
  it('accepts actual zero coordinates but rejects blanks and invalid radii', () => {
    expect(coverageGeometrySchema.parse({ ...input, centerLat: '0', centerLng: '0' }).centerLat).toBe(0);
    for (const change of [{ centerLat: '' }, { centerLng: '  ' }, { radiusKm: '0' }, { centerLat: '91' }, { etaMax: '5' }]) {
      expect(coverageGeometrySchema.safeParse({ ...input, ...change }).success).toBe(false);
    }
  });
  it('persists distributor city, district and description and preserves prices on a toggle', async () => {
    const distributor = await prisma.distributor.create({ data: { name: 'موزع اختبار المناطق', slug: `coverage-distributor-${suffix}` } });
    const zone = await createDeliveryZone(distributor.id, createDeliveryZoneSchema.parse({
      name: 'منطقة اختبار الموزع', city: 'بورتسودان', district: 'ديم عرب', description: 'وصف اختبار الموزع',
      baseFee: 250, perKmFee: 15, currency: 'USD', sortOrder: 9,
    }));
    expect(zone).toMatchObject({ city: 'بورتسودان', district: 'ديم عرب', description: 'وصف اختبار الموزع' });
    await updateDeliveryZone(distributor.id, zone.id, updateDeliveryZoneSchema.parse({ isActive: false }));
    const saved = await prisma.deliveryZone.findUniqueOrThrow({ where: { id: zone.id } });
    expect(Number(saved.perKmFee)).toBe(15); expect(saved.currency).toBe('USD'); expect(saved.sortOrder).toBe(9); expect(saved.isActive).toBe(false);
    await expect(updateDeliveryZone('other-distributor', zone.id, { description: 'تعديل غير مصرح' })).rejects.toThrow();
  });
});
