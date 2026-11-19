import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { resolveCoverageAddress } from '@/lib/geography/coverage-address';

const numeric = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
const optionalCoordinate = z.preprocess(value => value == null || value === '' ? null : numeric(value), z.number().finite().nullable());
const optionalNumber = z.preprocess(value => value == null || value === '' ? null : numeric(value), z.number().finite().nonnegative().nullable());
export const coverageGeometrySchema = z.object({
  code: z.string().trim().min(2).max(40).transform(value => value.toUpperCase()),
  centerLat: optionalCoordinate.pipe(z.number().min(-90).max(90).nullable()),
  centerLng: optionalCoordinate.pipe(z.number().min(-180).max(180).nullable()),
  radiusKm: optionalCoordinate.pipe(z.number().positive().max(500).nullable()),
  etaMin: optionalNumber, etaMax: optionalNumber,
}).refine(value => [value.centerLat, value.centerLng, value.radiusKm].filter(item => item != null).length % 3 === 0, { message: 'Enter all map fields or leave them all empty' })
.refine(value => value.etaMin == null || value.etaMax == null || value.etaMax >= value.etaMin);

export async function savePartnerServiceArea(partnerId: string, input: Record<string, unknown>, id?: string) {
  const address = resolveCoverageAddress(input);
  if (!address) throw new BusinessRuleError('اختر ولاية ومدينة وحيًا صحيحًا، وأدخل اسم المنطقة ووصفًا لا يتجاوز 1000 حرف.');
  const value = coverageGeometrySchema.parse(input);
  if (value.centerLat == null && (!address.city || !address.district)) throw new BusinessRuleError('المدينة والحي مطلوبان للتغطية بدون خريطة.');
  if (id && !await prisma.deliveryPartnerServiceArea.findFirst({ where: { id, partnerId, isActive: true }, select: { id: true } })) {
    throw new BusinessRuleError('المنطقة غير موجودة أو لا تتبع شركتك.');
  }
  const duplicate = await prisma.deliveryPartnerServiceArea.findUnique({ where: { partnerId_code: { partnerId, code: value.code } }, select: { id: true } });
  if (duplicate && duplicate.id !== id) throw new BusinessRuleError('كود المنطقة مستخدم بالفعل داخل شركتك.');
  const data = { ...address, code: value.code, centerLat: value.centerLat, centerLng: value.centerLng, radiusKm: value.radiusKm,
    estimatedMinutesMin: value.etaMin == null ? null : Math.round(value.etaMin),
    estimatedMinutesMax: value.etaMax == null ? null : Math.round(value.etaMax) };
  if (!id) return prisma.deliveryPartnerServiceArea.create({ data: { ...data, partnerId, isActive: true } });
  const result = await prisma.deliveryPartnerServiceArea.updateMany({ where: { id, partnerId, isActive: true }, data });
  if (!result.count) throw new BusinessRuleError('تعذر تعديل المنطقة. حدّث الصفحة وحاول مجددًا.');
  return prisma.deliveryPartnerServiceArea.findFirstOrThrow({ where: { id, partnerId } });
}
