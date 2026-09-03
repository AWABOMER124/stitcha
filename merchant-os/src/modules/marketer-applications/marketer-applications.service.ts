import { createHmac, randomBytes } from 'node:crypto';
import type { MarketerApplicationType, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { formatPhoneNumber } from '@/lib/utils/formatting';

export type MarketerApplicationInput = {
  type: MarketerApplicationType;
  merchantId?: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  channels: string[];
  experience?: string;
  audienceSize?: number;
  portfolioUrl?: string;
  notes?: string;
};

export async function listPublicAffiliateStores() {
  return prisma.storeAffiliateProgram.findMany({
    where: {
      isActive: true,
      commissionRate: { gt: 0 },
      merchant: { isActive: true, status: 'ACTIVE' },
    },
    select: {
      merchantId: true,
      commissionRate: true,
      currency: true,
      terms: true,
      merchant: { select: { name: true, slug: true, logo: true } },
    },
    orderBy: { merchant: { name: 'asc' } },
    take: 100,
  });
}

export async function submitMarketerApplication(input: MarketerApplicationInput, now = new Date()) {
  const phone = formatPhoneNumber(input.phone.trim());
  if (!/^\+249\d{9}$/.test(phone)) throw new ValidationError('أدخل رقم واتساب سودانياً صحيحاً');
  if (input.type === 'MERCHANT_ACQUISITION' && input.merchantId) throw new ValidationError('طلب استقطاب التجار لا يرتبط بمتجر');
  if (input.type === 'STOREFRONT_PRODUCTS' && !input.merchantId) throw new ValidationError('اختر المتجر الذي تريد التسويق له');
  if (input.type === 'STOREFRONT_PRODUCTS') {
    const eligible = await prisma.storeAffiliateProgram.findFirst({
      where: { merchantId: input.merchantId, isActive: true, commissionRate: { gt: 0 }, merchant: { isActive: true, status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!eligible) throw new ConflictError('برنامج العمولة في هذا المتجر غير متاح حالياً');
  }
  const applicationKey = applicationIdentityKey(input.type, input.merchantId, phone);
  const data = {
    type: input.type,
    merchantId: input.type === 'STOREFRONT_PRODUCTS' ? input.merchantId! : null,
    name: input.name.trim(),
    phone,
    email: input.email.trim().toLowerCase(),
    city: input.city.trim(),
    channels: [...new Set(input.channels.map(channel => channel.trim().toUpperCase()))],
    experience: input.experience?.trim() || null,
    audienceSize: input.audienceSize ?? null,
    portfolioUrl: input.portfolioUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    termsAcceptedAt: now,
  };
  try {
    return await prisma.marketerApplication.create({ data: { applicationKey, ...data } });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const existing = await prisma.marketerApplication.findUnique({ where: { applicationKey } });
    if (!existing) throw error;
    if (existing.status === 'PENDING') throw new ConflictError('لديك طلب قيد المراجعة لهذا البرنامج');
    if (existing.status === 'APPROVED') throw new ConflictError('أنت مسجل بالفعل في هذا البرنامج');
    return prisma.marketerApplication.update({
      where: { id: existing.id },
      data: { ...data, status: 'PENDING', affiliateId: null, reviewedById: null, reviewedAt: null, rejectionReason: null },
    });
  }
}

export async function listAcquisitionApplicationsForAdmin() {
  return prisma.marketerApplication.findMany({
    where: { type: 'MERCHANT_ACQUISITION' },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 300,
  });
}

export async function listProductApplicationsForMerchant(merchantId: string) {
  return prisma.marketerApplication.findMany({
    where: { merchantId, type: 'STOREFRONT_PRODUCTS' },
    include: { affiliate: { select: { id: true, code: true, status: true, identityVerification: { select: { status: true } } } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 300,
  });
}

export async function reviewAcquisitionApplication(input: {
  applicationId: string; reviewerId: string; decision: 'APPROVE' | 'REJECT'; reason?: string;
}, now = new Date()) {
  if (input.decision === 'REJECT' && !input.reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
  return prisma.$transaction(async tx => {
    await lockApplication(tx, input.applicationId);
    const application = await tx.marketerApplication.findFirst({ where: { id: input.applicationId, type: 'MERCHANT_ACQUISITION' } });
    if (!application) throw new NotFoundError('Marketer application');
    if (application.status !== 'PENDING') throw new ConflictError('تمت مراجعة الطلب مسبقاً');
    return tx.marketerApplication.update({
      where: { id: application.id },
      data: { status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, rejectionReason: input.decision === 'REJECT' ? input.reason!.trim() : null },
    });
  });
}

export async function reviewProductApplication(input: {
  merchantId: string; applicationId: string; reviewerId: string; decision: 'APPROVE' | 'REJECT'; reason?: string;
}, now = new Date()) {
  if (input.decision === 'REJECT' && !input.reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
  return prisma.$transaction(async tx => {
    await lockApplication(tx, input.applicationId);
    const application = await tx.marketerApplication.findFirst({
      where: { id: input.applicationId, merchantId: input.merchantId, type: 'STOREFRONT_PRODUCTS' },
    });
    if (!application) throw new NotFoundError('Marketer application');
    if (application.status !== 'PENDING') throw new ConflictError('تمت مراجعة الطلب مسبقاً');
    if (input.decision === 'REJECT') {
      return tx.marketerApplication.update({
        where: { id: application.id },
        data: { status: 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, rejectionReason: input.reason!.trim() },
      });
    }
    const program = await tx.storeAffiliateProgram.findUnique({ where: { merchantId: input.merchantId } });
    if (!program) throw new ConflictError('فعّل برنامج التسويق بالعمولة أولاً');
    const existing = await tx.storeAffiliate.findUnique({
      where: { merchantId_phone: { merchantId: input.merchantId, phone: application.phone } },
      select: { id: true },
    });
    const affiliate = existing ?? await tx.storeAffiliate.create({
      data: {
        merchantId: input.merchantId,
        programId: program.id,
        name: application.name,
        phone: application.phone,
        email: application.email,
        code: `AFF-${randomBytes(5).toString('hex').toUpperCase()}`,
      },
      select: { id: true },
    });
    return tx.marketerApplication.update({
      where: { id: application.id },
      data: { status: 'APPROVED', affiliateId: affiliate.id, reviewedById: input.reviewerId, reviewedAt: now, rejectionReason: null },
    });
  });
}

export function applicationIdentityKey(type: MarketerApplicationType, merchantId: string | undefined, phone: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('Marketer application security is not configured');
  return createHmac('sha256', secret).update(JSON.stringify([type, merchantId ?? null, phone])).digest('hex');
}

async function lockApplication(tx: Prisma.TransactionClient, applicationId: string) {
  await tx.$queryRaw`SELECT id FROM marketer_applications WHERE id = ${applicationId} FOR UPDATE`;
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
