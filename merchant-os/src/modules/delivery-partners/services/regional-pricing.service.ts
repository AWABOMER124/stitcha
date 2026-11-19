import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { resolveRegionalCoverage } from '@/lib/geography/regional-coverage';

const optionalMinutes = z.preprocess(value => value === '' || value == null ? null : Number(value), z.number().int().min(0).max(10080).nullable());
export const regionalPriceSchema = z.object({
  baseFee: z.preprocess(value => value == null ? '' : typeof value === 'number' ? String(value) : value,
    z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, 'أدخل سعرًا صحيحًا، بحد أقصى منزلتين عشريتين.').transform(Number).pipe(z.number().finite().min(0).max(99999999.99))),
  etaMin: optionalMinutes, etaMax: optionalMinutes,
}).refine(value => value.etaMin == null || value.etaMax == null || value.etaMax >= value.etaMin, 'زمن التوصيل الأعلى يجب ألا يقل عن الأدنى.');

export async function saveRegionalPrice(partnerId: string, input: Record<string, unknown>, priceId?: string) {
  const address = resolveRegionalCoverage(input);
  if (!address) throw new BusinessRuleError('اختر الولاية والمدينة أو كل المدن، ثم الحي أو كل الأحياء.');
  const parsed = regionalPriceSchema.safeParse(input);
  if (!parsed.success) throw new BusinessRuleError(parsed.error.issues[0]?.message ?? 'راجع السعر وزمن التوصيل.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${partnerId} FOR UPDATE`;
    const current = priceId ? await tx.deliveryPartnerPricingRule.findFirst({ where: { id: priceId, partnerId, isActive: true } }) : null;
    if (priceId && !current) throw new BusinessRuleError('التسعيرة غير موجودة أو لا تتبع شركتك.');
    const duplicate = await tx.deliveryPartnerPricingRule.findFirst({ where: {
      partnerId, isActive: true, ...(priceId ? { id: { not: priceId } } : {}), perKmFee: 0, maxDistanceKm: null,
      serviceArea: { isActive: true, state: address.state, city: address.city, district: address.district, allCities: address.allCities, allDistricts: address.allDistricts },
    } });
    if (duplicate) throw new BusinessRuleError('توجد تسعيرة لهذا النطاق بالفعل؛ اختر تعديل التسعيرة الحالية.');
    const area = await tx.deliveryPartnerServiceArea.create({ data: {
      partnerId, ...address, code: `LOC-${randomUUID().slice(0, 12).toUpperCase()}`, centerLat: null, centerLng: null, radiusKm: null,
      estimatedMinutesMin: parsed.data.etaMin, estimatedMinutesMax: parsed.data.etaMax,
    } });
    const data = { serviceAreaId: area.id, baseFee: parsed.data.baseFee, perKmFee: 0, minimumFee: 0, maximumFee: null, maxDistanceKm: null, currency: 'SDG' };
    const price = current
      ? await tx.deliveryPartnerPricingRule.update({ where: { id: current.id }, data })
      : await tx.deliveryPartnerPricingRule.create({ data: { partnerId, ...data } });
    if (current?.serviceAreaId) await tx.deliveryPartnerServiceArea.updateMany({
      where: { id: current.serviceAreaId, partnerId, pricingRules: { none: { isActive: true } } }, data: { isActive: false },
    });
    return { ...price, serviceArea: area };
  });
}
