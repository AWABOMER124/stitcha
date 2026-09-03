import { createHmac, randomBytes } from 'node:crypto';
import type { Prisma, StoreAffiliateCommissionStatus } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { formatPhoneNumber } from '@/lib/utils/formatting';

type Db = Prisma.TransactionClient | typeof prisma;

export const AFFILIATE_COOKIE = 'wasla_aff';

export function normalizeAffiliateCode(value: string | null | undefined) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9-]{6,32}$/.test(code) ? code : null;
}

export function affiliateTokenHash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('Affiliate attribution security is not configured');
  return createHmac('sha256', secret).update(`store-affiliate:${token}`).digest('hex');
}

export function affiliateCookiePath(slug: string) {
  return `/api/store/${encodeURIComponent(slug)}`;
}

export async function ensureStoreAffiliateProgram(merchantId: string, tx: Db = prisma) {
  return tx.storeAffiliateProgram.upsert({
    where: { merchantId },
    update: {},
    create: { merchantId },
  });
}

export async function updateStoreAffiliateProgram(merchantId: string, input: {
  isActive: boolean;
  commissionRate: number;
  attributionDays: number;
  holdDays: number;
  minimumPayout: number;
  currency: string;
  terms?: string;
}) {
  if (input.commissionRate < 0 || input.commissionRate > 100) throw new ValidationError('نسبة العمولة يجب أن تكون بين 0 و100');
  if (input.isActive && input.commissionRate <= 0) throw new ValidationError('حدد نسبة عمولة أكبر من صفر قبل التفعيل');
  if (input.attributionDays < 1 || input.attributionDays > 90 || input.holdDays < 0 || input.holdDays > 180) throw new ValidationError('فترة الإسناد أو التعليق خارج النطاق المسموح');
  if (input.minimumPayout < 0 || input.minimumPayout > 1_000_000_000) throw new ValidationError('حد السداد غير صالح');
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3,6}$/.test(currency)) throw new ValidationError('رمز العملة يجب أن يتكون من 3 إلى 6 أحرف إنجليزية');
  return prisma.storeAffiliateProgram.upsert({
    where: { merchantId },
    update: { ...input, currency, terms: input.terms?.trim() || null },
    create: { merchantId, ...input, currency, terms: input.terms?.trim() || null },
  });
}

export async function createStoreAffiliate(merchantId: string, input: { name: string; phone: string; email?: string }) {
  const program = await ensureStoreAffiliateProgram(merchantId);
  const phone = formatPhoneNumber(input.phone.trim());
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.storeAffiliate.create({
        data: {
          merchantId,
          programId: program.id,
          name: input.name.trim(),
          phone,
          email: input.email?.trim().toLowerCase() || null,
          code: `AFF-${randomBytes(5).toString('hex').toUpperCase()}`,
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const duplicatePhone = await prisma.storeAffiliate.findUnique({ where: { merchantId_phone: { merchantId, phone } } });
      if (duplicatePhone) throw new ConflictError('رقم المسوّق مسجل بالفعل في هذا المتجر');
    }
  }
  throw new ConflictError('تعذر إنشاء رمز فريد للمسوّق، حاول مجدداً');
}

export async function setStoreAffiliateStatus(merchantId: string, affiliateId: string, status: 'ACTIVE' | 'SUSPENDED') {
  const result = await prisma.storeAffiliate.updateMany({ where: { id: affiliateId, merchantId }, data: { status } });
  if (result.count !== 1) throw new NotFoundError('Affiliate');
}

export async function createStoreAffiliateVisit(slug: string, rawCode: string, now = new Date()) {
  const code = normalizeAffiliateCode(rawCode);
  if (!code) return null;
  const affiliate = await prisma.storeAffiliate.findFirst({
    where: {
      code,
      status: 'ACTIVE',
      merchant: { slug, isActive: true, status: 'ACTIVE' },
      program: { isActive: true, commissionRate: { gt: 0 } },
    },
    include: { program: true },
  });
  if (!affiliate) return null;
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + affiliate.program.attributionDays);
  await prisma.storeAffiliateVisit.create({
    data: {
      merchantId: affiliate.merchantId,
      programId: affiliate.programId,
      affiliateId: affiliate.id,
      tokenHash: affiliateTokenHash(token),
      visitedAt: now,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function attachStoreAffiliateAttribution(
  tx: Prisma.TransactionClient,
  input: { merchantId: string; orderId: string; token?: string | null },
  now = new Date(),
) {
  if (!input.token) return null;
  const [visit, order] = await Promise.all([
    tx.storeAffiliateVisit.findUnique({
      where: { tokenHash: affiliateTokenHash(input.token) },
      include: { affiliate: true, program: true },
    }),
    tx.order.findUnique({ where: { id: input.orderId }, select: { merchantId: true, subtotal: true } }),
  ]);
  if (!visit || !order || order.merchantId !== input.merchantId || visit.merchantId !== input.merchantId || visit.expiresAt <= now) return null;
  if (order.subtotal.lte(0)) return null;
  if (!visit.program.isActive || Number(visit.program.commissionRate) <= 0 || visit.affiliate.status !== 'ACTIVE') return null;
  return tx.storeAffiliateAttribution.upsert({
    where: { orderId: input.orderId },
    update: {},
    create: {
      merchantId: input.merchantId,
      programId: visit.programId,
      affiliateId: visit.affiliateId,
      visitId: visit.id,
      orderId: input.orderId,
      codeSnapshot: visit.affiliate.code,
      commissionRateSnapshot: visit.program.commissionRate,
      baseAmount: order.subtotal,
      currencySnapshot: visit.program.currency,
      holdDaysSnapshot: visit.program.holdDays,
      minimumPayoutSnapshot: visit.program.minimumPayout,
      attributedAt: now,
    },
  });
}

export async function qualifyStoreAffiliateCommission(
  tx: Prisma.TransactionClient,
  orderId: string,
  now = new Date(),
) {
  const candidate = await tx.storeAffiliateAttribution.findUnique({ where: { orderId }, select: { id: true, status: true } });
  if (!candidate || candidate.status !== 'ATTRIBUTED') return null;
  await tx.$queryRaw`SELECT id FROM store_affiliate_attributions WHERE id = ${candidate.id} FOR UPDATE`;
  const attribution = await tx.storeAffiliateAttribution.findUnique({
    where: { id: candidate.id },
    include: {
      affiliate: { select: { status: true } },
      commission: { select: { id: true } },
      order: { select: { status: true, merchantId: true } },
    },
  });
  if (!attribution || attribution.status !== 'ATTRIBUTED' || attribution.commission || attribution.affiliate.status !== 'ACTIVE') return null;
  if (attribution.order.status !== 'DELIVERED' || attribution.order.merchantId !== attribution.merchantId) return null;
  const amount = attribution.baseAmount.mul(attribution.commissionRateSnapshot).div(100).toDecimalPlaces(2);
  if (amount.lte(0)) return null;
  const holdUntil = new Date(now);
  holdUntil.setUTCDate(holdUntil.getUTCDate() + attribution.holdDaysSnapshot);
  return tx.storeAffiliateCommission.create({
    data: {
      merchantId: attribution.merchantId,
      affiliateId: attribution.affiliateId,
      attributionId: attribution.id,
      orderId,
      amount,
      currency: attribution.currencySnapshot,
      holdUntil,
    },
  });
}

export async function voidStoreAffiliateAttribution(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: 'ORDER_CANCELLED' | 'ORDER_REJECTED' | 'PAYMENT_REFUNDED',
  now = new Date(),
) {
  const attribution = await tx.storeAffiliateAttribution.findUnique({ where: { orderId }, select: { id: true } });
  if (!attribution) return null;
  await tx.$queryRaw`SELECT id FROM store_affiliate_attributions WHERE id = ${attribution.id} FOR UPDATE`;
  await tx.storeAffiliateAttribution.updateMany({
    where: { id: attribution.id, status: 'ATTRIBUTED' },
    data: { status: 'VOID', voidedAt: now, voidReason: reason },
  });
  await tx.storeAffiliateCommission.updateMany({
    where: { orderId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } },
    data: { status: 'REVERSED', reversedAt: now, note: reason },
  });
  return attribution;
}

export async function reviewStoreAffiliateCommission(input: {
  merchantId: string;
  commissionId: string;
  reviewerId: string;
  decision: 'APPROVE' | 'REJECT' | 'PAY';
  note?: string;
  paymentRef?: string;
}, now = new Date()) {
  return prisma.$transaction(async tx => {
    const ownership = await tx.storeAffiliateCommission.findFirst({
      where: { id: input.commissionId, merchantId: input.merchantId },
      select: { affiliateId: true },
    });
    if (!ownership) throw new NotFoundError('Affiliate commission');
    // Serialize every financial decision for one marketer. This prevents two
    // simultaneous payout requests from assigning different references to the
    // same approved balance.
    await tx.$queryRaw`SELECT id FROM store_affiliates WHERE id = ${ownership.affiliateId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM store_affiliate_commissions WHERE id = ${input.commissionId} FOR UPDATE`;
    const commission = await tx.storeAffiliateCommission.findFirst({
      where: { id: input.commissionId, merchantId: input.merchantId },
      include: {
        affiliate: { select: { status: true } },
      },
    });
    if (!commission) throw new NotFoundError('Affiliate commission');
    if (input.decision === 'APPROVE') {
      requireCommissionStatus(commission.status, 'PENDING');
      if (commission.holdUntil > now) throw new ConflictError('لم تنتهِ فترة تعليق العمولة');
      if (commission.affiliate.status !== 'ACTIVE') throw new ConflictError('المسوّق موقوف؛ راجع العمولة قبل الاعتماد');
      return tx.storeAffiliateCommission.update({ where: { id: commission.id }, data: { status: 'APPROVED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note?.trim() || null } });
    }
    if (input.decision === 'REJECT') {
      requireCommissionStatus(commission.status, 'PENDING');
      if (!input.note?.trim()) throw new ValidationError('سبب الرفض مطلوب');
      return tx.storeAffiliateCommission.update({ where: { id: commission.id }, data: { status: 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note.trim() } });
    }
    requireCommissionStatus(commission.status, 'APPROVED');
    if (!input.paymentRef?.trim()) throw new ValidationError('مرجع السداد مطلوب');
    const approved = await tx.storeAffiliateCommission.findMany({
      where: { merchantId: input.merchantId, affiliateId: commission.affiliateId, currency: commission.currency, status: 'APPROVED' },
      select: { amount: true, attribution: { select: { minimumPayoutSnapshot: true } } },
    });
    const approvedTotal = approved.reduce((sum, item) => sum + Number(item.amount), 0);
    const requiredThreshold = Math.max(...approved.map(item => Number(item.attribution.minimumPayoutSnapshot)), 0);
    if (approvedTotal < requiredThreshold) {
      throw new ConflictError('لم يصل رصيد المسوّق المعتمد إلى الحد الأدنى للسداد');
    }
    return tx.storeAffiliateCommission.updateMany({
      where: { merchantId: input.merchantId, affiliateId: commission.affiliateId, currency: commission.currency, status: 'APPROVED' },
      data: { status: 'PAID', paidAt: now, paymentRef: input.paymentRef.trim(), note: input.note?.trim() || commission.note },
    });
  });
}

export async function getStoreAffiliateDashboard(merchantId: string) {
  const program = await ensureStoreAffiliateProgram(merchantId);
  const [merchant, affiliates, commissions, totals] = await Promise.all([
    prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { slug: true } }),
    prisma.storeAffiliate.findMany({
      where: { merchantId },
      include: { _count: { select: { visits: true, attributions: true, commissions: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.storeAffiliateCommission.findMany({
      where: { merchantId },
      include: { affiliate: { select: { name: true, code: true } }, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.storeAffiliateCommission.groupBy({
      by: ['status'], where: { merchantId }, _count: { _all: true }, _sum: { amount: true },
    }),
  ]);
  return { program, merchant, affiliates, commissions, totals };
}

function requireCommissionStatus(current: StoreAffiliateCommissionStatus, expected: StoreAffiliateCommissionStatus) {
  if (current !== expected) throw new ConflictError('تمت معالجة العمولة مسبقاً أو تغيرت حالتها');
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
