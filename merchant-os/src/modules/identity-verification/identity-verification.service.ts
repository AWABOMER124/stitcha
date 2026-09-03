import { createHmac, randomBytes } from 'node:crypto';
import type { IdentityDocumentType, PayoutMethod, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/crypto/secret';
import { normalizePrivateEvidence } from '@/services/storage/private-evidence-input';
import { privateStorageService } from '@/services/storage';

type VerificationInput = {
  legalName: string;
  documentType: IdentityDocumentType;
  documentNumber: string;
  expiresAt: Date;
};

type PayoutInput = {
  method: PayoutMethod;
  bankName?: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
};

type UploadedDocument = {
  side: 'FRONT' | 'BACK';
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

export function affiliateOnboardingTokenHash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('Affiliate onboarding security is not configured');
  return createHmac('sha256', secret).update(`affiliate-onboarding:${token}`).digest('hex');
}

export async function getMerchantIdentityDashboard(merchantId: string) {
  const [verification, payout] = await Promise.all([
    prisma.merchantIdentityVerification.findUnique({
      where: { merchantId },
      include: { documents: { select: { id: true, side: true, fileName: true, mimeType: true, createdAt: true } } },
    }),
    prisma.merchantReferralPayoutProfile.findUnique({ where: { merchantId } }),
  ]);
  return { verification, payout: payout ? maskPayout(payout) : null };
}

export async function submitMerchantIdentity(
  merchantId: string,
  input: VerificationInput,
  front: File,
  back?: File,
) {
  validateVerification(input);
  const current = await prisma.merchantIdentityVerification.findUnique({
    where: { merchantId }, select: { status: true },
  });
  if (current?.status === 'PENDING') throw new ConflictError('طلب التحقق قيد المراجعة حالياً');
  if (current?.status === 'APPROVED') throw new ConflictError('هوية المتجر مؤكدة بالفعل؛ تواصل مع الدعم لتغييرها');
  const uploaded = await uploadDocuments([['FRONT', front], ...(back ? [['BACK', back] as const] : [])], `merchant-${merchantId}-kyc`);
  try {
    const oldKeys = await prisma.merchantIdentityDocument.findMany({
      where: { verification: { merchantId } }, select: { storageKey: true },
    });
    const result = await prisma.$transaction(async tx => {
      const verification = await tx.merchantIdentityVerification.upsert({
        where: { merchantId },
        update: verificationData(input),
        create: { merchantId, ...verificationData(input) },
      });
      await tx.merchantIdentityDocument.deleteMany({ where: { verificationId: verification.id } });
      await tx.merchantIdentityDocument.createMany({
        data: uploaded.map(document => ({ verificationId: verification.id, ...document })),
      });
      return verification;
    });
    await Promise.all(oldKeys.map(item => privateStorageService.delete(item.storageKey).catch(() => undefined)));
    return result;
  } catch (error) {
    await deleteUploaded(uploaded);
    throw error;
  }
}

export async function saveMerchantReferralPayout(merchantId: string, input: PayoutInput) {
  validatePayout(input);
  return prisma.merchantReferralPayoutProfile.upsert({
    where: { merchantId },
    update: payoutData(input),
    create: { merchantId, ...payoutData(input) },
  });
}

export async function issueStoreAffiliateOnboarding(merchantId: string, affiliateId: string, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  const result = await prisma.storeAffiliate.updateMany({
    where: { id: affiliateId, merchantId },
    data: { onboardingTokenHash: affiliateOnboardingTokenHash(token), onboardingTokenExpiresAt: expiresAt },
  });
  if (result.count !== 1) throw new NotFoundError('Affiliate');
  return { token, expiresAt };
}

export async function getStoreAffiliateOnboarding(token: string, now = new Date()) {
  if (token.length < 32 || token.length > 100) return null;
  const affiliate = await prisma.storeAffiliate.findFirst({
    where: {
      onboardingTokenHash: affiliateOnboardingTokenHash(token),
      onboardingTokenExpiresAt: { gt: now },
      status: 'ACTIVE',
    },
    include: {
      merchant: { select: { name: true } },
      identityVerification: { select: { status: true, rejectionReason: true, expiresAt: true } },
      payoutProfile: true,
    },
  });
  if (!affiliate) return null;
  return {
    id: affiliate.id,
    name: affiliate.name,
    merchantName: affiliate.merchant.name,
    verification: affiliate.identityVerification,
    payout: affiliate.payoutProfile ? maskPayout(affiliate.payoutProfile) : null,
  };
}

export async function submitStoreAffiliateOnboarding(
  token: string,
  input: VerificationInput & PayoutInput,
  front: File,
  back?: File,
  now = new Date(),
) {
  validateVerification(input, now);
  validatePayout(input);
  const affiliate = await prisma.storeAffiliate.findFirst({
    where: { onboardingTokenHash: affiliateOnboardingTokenHash(token), onboardingTokenExpiresAt: { gt: now }, status: 'ACTIVE' },
    include: { identityVerification: { select: { status: true } } },
  });
  if (!affiliate) throw new NotFoundError('Affiliate onboarding invitation');
  if (affiliate.identityVerification?.status === 'PENDING') throw new ConflictError('طلب التحقق قيد المراجعة');
  if (affiliate.identityVerification?.status === 'APPROVED') throw new ConflictError('تم تأكيد الهوية بالفعل');
  const uploaded = await uploadDocuments([['FRONT', front], ...(back ? [['BACK', back] as const] : [])], `affiliate-${affiliate.id}-kyc`);
  try {
    const oldKeys = await prisma.storeAffiliateIdentityDocument.findMany({
      where: { verification: { affiliateId: affiliate.id } }, select: { storageKey: true },
    });
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM store_affiliates WHERE id = ${affiliate.id} FOR UPDATE`;
      const locked = await tx.storeAffiliate.findFirst({
        where: { id: affiliate.id, onboardingTokenHash: affiliateOnboardingTokenHash(token), onboardingTokenExpiresAt: { gt: now } },
        select: { id: true },
      });
      if (!locked) throw new NotFoundError('Affiliate onboarding invitation');
      const verification = await tx.storeAffiliateIdentityVerification.upsert({
        where: { affiliateId: affiliate.id },
        update: verificationData(input),
        create: { merchantId: affiliate.merchantId, affiliateId: affiliate.id, ...verificationData(input) },
      });
      await tx.storeAffiliateIdentityDocument.deleteMany({ where: { verificationId: verification.id } });
      await tx.storeAffiliateIdentityDocument.createMany({
        data: uploaded.map(document => ({ verificationId: verification.id, ...document })),
      });
      await tx.storeAffiliatePayoutProfile.upsert({
        where: { affiliateId: affiliate.id },
        update: payoutData(input),
        create: { merchantId: affiliate.merchantId, affiliateId: affiliate.id, ...payoutData(input) },
      });
      await tx.storeAffiliate.update({ where: { id: affiliate.id }, data: { onboardingTokenHash: null, onboardingTokenExpiresAt: null } });
    });
    await Promise.all(oldKeys.map(item => privateStorageService.delete(item.storageKey).catch(() => undefined)));
  } catch (error) {
    await deleteUploaded(uploaded);
    throw error;
  }
}

export async function listIdentityVerificationsForAdmin() {
  const [merchants, affiliates] = await Promise.all([
    prisma.merchantIdentityVerification.findMany({
      include: { merchant: { select: { name: true, slug: true } }, documents: { select: { id: true, side: true, fileName: true } } },
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }], take: 200,
    }),
    prisma.storeAffiliateIdentityVerification.findMany({
      include: { affiliate: { select: { name: true, code: true, payoutProfile: true } }, merchant: { select: { name: true, slug: true } }, documents: { select: { id: true, side: true, fileName: true } } },
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }], take: 200,
    }),
  ]);
  return {
    merchants: merchants.map(item => ({ ...item, documentNumberEncrypted: undefined })),
    affiliates: affiliates.map(item => ({
      ...item,
      documentNumberEncrypted: undefined,
      affiliate: { ...item.affiliate, payoutProfile: item.affiliate.payoutProfile ? maskPayout(item.affiliate.payoutProfile) : null },
    })),
  };
}

export async function reviewIdentityVerification(input: {
  kind: 'MERCHANT' | 'AFFILIATE';
  verificationId: string;
  reviewerId: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
}, now = new Date()) {
  if (input.decision === 'REJECT' && !input.reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
  return prisma.$transaction(async tx => {
    if (input.kind === 'MERCHANT') {
      await tx.$queryRaw`SELECT id FROM merchant_identity_verifications WHERE id = ${input.verificationId} FOR UPDATE`;
      const item = await tx.merchantIdentityVerification.findUnique({ where: { id: input.verificationId } });
      if (!item) throw new NotFoundError('Identity verification');
      return reviewMerchantRecord(tx, item, input, now);
    }
    await tx.$queryRaw`SELECT id FROM store_affiliate_identity_verifications WHERE id = ${input.verificationId} FOR UPDATE`;
    const item = await tx.storeAffiliateIdentityVerification.findUnique({ where: { id: input.verificationId } });
    if (!item) throw new NotFoundError('Identity verification');
    return reviewAffiliateRecord(tx, item, input, now);
  });
}

export async function downloadIdentityDocument(
  kind: 'MERCHANT' | 'AFFILIATE',
  documentId: string,
  actor: { isPlatform: boolean; merchantId?: string | null },
) {
  if (kind === 'MERCHANT') {
    const document = await prisma.merchantIdentityDocument.findUnique({
      where: { id: documentId }, include: { verification: { select: { merchantId: true } } },
    });
    if (!document || (!actor.isPlatform && actor.merchantId !== document.verification.merchantId)) throw new NotFoundError('Identity document');
    return privateStorageService.download(document.storageKey);
  }
  const document = await prisma.storeAffiliateIdentityDocument.findUnique({
    where: { id: documentId }, include: { verification: { select: { merchantId: true } } },
  });
  if (!document || (!actor.isPlatform && actor.merchantId !== document.verification.merchantId)) throw new NotFoundError('Identity document');
  return privateStorageService.download(document.storageKey);
}

function validateVerification(input: VerificationInput, now = new Date()) {
  if (input.legalName.trim().length < 3 || input.legalName.trim().length > 160) throw new ValidationError('الاسم القانوني غير صالح');
  const documentNumber = input.documentNumber.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9-]{5,40}$/.test(documentNumber)) throw new ValidationError('رقم الهوية أو الجواز غير صالح');
  if (Number.isNaN(input.expiresAt.getTime()) || input.expiresAt <= now) throw new ValidationError('يجب أن تكون الوثيقة سارية');
}

function verificationData(input: VerificationInput) {
  return {
    legalName: input.legalName.trim(),
    documentType: input.documentType,
    documentNumberEncrypted: encryptSecret(input.documentNumber.replace(/\s+/g, '').toUpperCase()),
    expiresAt: input.expiresAt,
    status: 'PENDING' as const,
    submittedAt: new Date(),
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
  };
}

function validatePayout(input: PayoutInput) {
  if (input.accountName.trim().length < 3 || input.accountName.trim().length > 160) throw new ValidationError('اسم الحساب غير صالح');
  const account = input.accountNumber.replace(/\s+/g, '');
  if (!/^[A-Z0-9+-]{5,40}$/i.test(account)) throw new ValidationError('رقم الحساب غير صالح');
  const iban = input.iban?.replace(/\s+/g, '').toUpperCase();
  if (iban && !/^[A-Z]{2}[A-Z0-9]{13,32}$/.test(iban)) throw new ValidationError('رقم IBAN غير صالح');
  if (input.bankName && input.bankName.trim().length > 120) throw new ValidationError('اسم البنك طويل جداً');
}

function payoutData(input: PayoutInput) {
  const iban = input.iban?.replace(/\s+/g, '').toUpperCase();
  return {
    method: input.method,
    bankName: input.bankName?.trim() || null,
    accountNameEncrypted: encryptSecret(input.accountName.trim()),
    accountNumberEncrypted: encryptSecret(input.accountNumber.replace(/\s+/g, '').toUpperCase()),
    ibanEncrypted: iban ? encryptSecret(iban) : null,
  };
}

function maskPayout(profile: { method: PayoutMethod; bankName: string | null; accountNameEncrypted: string; accountNumberEncrypted: string; ibanEncrypted: string | null }) {
  return {
    method: profile.method,
    bankName: profile.bankName,
    accountName: decryptSecret(profile.accountNameEncrypted),
    accountNumber: maskSecret(decryptSecret(profile.accountNumberEncrypted)),
    iban: profile.ibanEncrypted ? maskSecret(decryptSecret(profile.ibanEncrypted)) : null,
  };
}

async function uploadDocuments(files: ReadonlyArray<readonly ['FRONT' | 'BACK', File]>, scope: string) {
  const uploaded: UploadedDocument[] = [];
  try {
    for (const [side, file] of files) {
      const evidence = await normalizePrivateEvidence(file);
      const storageKey = await privateStorageService.upload(evidence.buffer, evidence.filename, evidence.mimeType, scope);
      uploaded.push({ side, storageKey, fileName: file.name.trim().slice(0, 180) || evidence.filename, mimeType: evidence.mimeType, size: evidence.buffer.length, sha256: evidence.sha256 });
    }
    return uploaded;
  } catch (error) {
    await deleteUploaded(uploaded);
    throw error;
  }
}

async function deleteUploaded(uploaded: UploadedDocument[]) {
  await Promise.all(uploaded.map(item => privateStorageService.delete(item.storageKey).catch(() => undefined)));
}

async function reviewMerchantRecord(
  tx: Prisma.TransactionClient,
  item: { id: string; status: string; expiresAt: Date },
  input: { decision: 'APPROVE' | 'REJECT'; reviewerId: string; reason?: string },
  now: Date,
) {
  if (item.status !== 'PENDING') throw new ConflictError('تمت مراجعة الطلب مسبقاً');
  if (input.decision === 'APPROVE' && item.expiresAt <= now) {
    throw new ConflictError('الوثيقة منتهية ولا يمكن اعتمادها');
  }
  return tx.merchantIdentityVerification.update({ where: { id: item.id }, data: { status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, rejectionReason: input.decision === 'REJECT' ? input.reason!.trim() : null } });
}

async function reviewAffiliateRecord(
  tx: Prisma.TransactionClient,
  item: { id: string; status: string; expiresAt: Date },
  input: { decision: 'APPROVE' | 'REJECT'; reviewerId: string; reason?: string },
  now: Date,
) {
  if (item.status !== 'PENDING') throw new ConflictError('تمت مراجعة الطلب مسبقاً');
  if (input.decision === 'APPROVE' && item.expiresAt <= now) {
    throw new ConflictError('الوثيقة منتهية ولا يمكن اعتمادها');
  }
  return tx.storeAffiliateIdentityVerification.update({ where: { id: item.id }, data: { status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, rejectionReason: input.decision === 'REJECT' ? input.reason!.trim() : null } });
}
