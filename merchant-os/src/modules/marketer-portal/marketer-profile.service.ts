import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/crypto/secret';
import { normalizePrivateEvidence } from '@/services/storage/private-evidence-input';
import { privateStorageService, storageService } from '@/services/storage';
import { normalizeProductImage } from '@/services/product-images/product-image-input';

export async function updateMarketerProfile(userId: string, input: { name: string; city?: string; bio?: string }) {
  return prisma.$transaction(async tx => {
    const account = await tx.marketerAccount.findUnique({ where: { userId }, select: { id: true } });
    if (!account) throw new NotFoundError('Marketer account');
    await tx.user.update({ where: { id: userId }, data: { name: input.name.trim() } });
    return tx.marketerAccount.update({ where: { id: account.id }, data: { city: input.city?.trim() || null, bio: input.bio?.trim() || null } });
  });
}

export async function uploadMarketerAvatar(userId: string, file: File) {
  const image = await normalizeProductImage(file, 'logo');
  const path = await storageService.upload(image.buffer, 'avatar.webp', image.mimeType, `marketer-${userId}-avatar`);
  const url = storageService.getUrl(path);
  await prisma.user.update({ where: { id: userId }, data: { image: url } });
  return { url };
}

export async function uploadMarketerCv(userId: string, file: File) {
  const account = await prisma.marketerAccount.findUnique({ where: { userId }, select: { id: true, cvStorageKey: true } });
  if (!account) throw new NotFoundError('Marketer account');
  const evidence = await normalizePrivateEvidence(file);
  if (evidence.mimeType !== 'application/pdf') throw new ValidationError('السيرة الذاتية يجب أن تكون PDF');
  const key = await privateStorageService.upload(evidence.buffer, 'cv.pdf', evidence.mimeType, `marketer-${account.id}-cv`);
  await prisma.marketerAccount.update({ where: { id: account.id }, data: { cvStorageKey: key, cvFileName: file.name.slice(0, 180) } });
  if (account.cvStorageKey) await privateStorageService.delete(account.cvStorageKey).catch(() => undefined);
}

export async function saveMarketerPayout(userId: string, input: { method: 'BANK_ACCOUNT' | 'BANKAK' | 'MYCASHY' | 'OTHER'; bankName?: string; accountName: string; accountNumber: string; iban?: string }) {
  const account = await prisma.marketerAccount.findUnique({ where: { userId }, select: { id: true } });
  if (!account) throw new NotFoundError('Marketer account');
  return prisma.marketerPayoutProfile.upsert({ where: { marketerAccountId: account.id }, update: payoutData(input), create: { marketerAccountId: account.id, ...payoutData(input) } });
}

export async function submitMarketerIdentity(userId: string, input: { legalName: string; documentType: 'NATIONAL_ID' | 'PASSPORT'; documentNumber: string; expiresAt: Date }, front: File, back?: File) {
  if (input.expiresAt <= new Date()) throw new ValidationError('يجب أن تكون الوثيقة سارية');
  const account = await prisma.marketerAccount.findUnique({ where: { userId }, include: { identityVerification: { select: { status: true } } } });
  if (!account) throw new NotFoundError('Marketer account');
  if (account.identityVerification?.status === 'PENDING') throw new ConflictError('طلب التحقق قيد المراجعة');
  if (account.identityVerification?.status === 'APPROVED') throw new ConflictError('تم تأكيد الهوية بالفعل');
  const files = await Promise.all([front, ...(back ? [back] : [])].map(file => normalizePrivateEvidence(file)));
  const uploaded = await Promise.all(files.map((file, index) => privateStorageService.upload(file.buffer, index ? 'back' : 'front', file.mimeType, `marketer-${account.id}-kyc`).then(storageKey => ({ ...file, storageKey, side: index ? 'BACK' as const : 'FRONT' as const }))));
  try {
    const old = await prisma.marketerIdentityDocument.findMany({ where: { verification: { marketerAccountId: account.id } }, select: { storageKey: true } });
    await prisma.$transaction(async tx => {
      const verification = await tx.marketerIdentityVerification.upsert({ where: { marketerAccountId: account.id }, update: verificationData(input), create: { marketerAccountId: account.id, ...verificationData(input) } });
      await tx.marketerIdentityDocument.deleteMany({ where: { verificationId: verification.id } });
      await tx.marketerIdentityDocument.createMany({ data: uploaded.map(item => ({ verificationId: verification.id, side: item.side, storageKey: item.storageKey, fileName: item.filename, mimeType: item.mimeType, size: item.buffer.byteLength, sha256: item.sha256 })) });
    });
    await Promise.all(old.map(item => privateStorageService.delete(item.storageKey).catch(() => undefined)));
  } catch (error) { await Promise.all(uploaded.map(item => privateStorageService.delete(item.storageKey).catch(() => undefined))); throw error; }
}

export async function reviewMarketerIdentity(verificationId: string, reviewerId: string, decision: 'APPROVE' | 'REJECT', reason?: string) {
  if (decision === 'REJECT' && !reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
  return prisma.marketerIdentityVerification.update({ where: { id: verificationId }, data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: decision === 'REJECT' ? reason!.trim() : null } });
}

export function maskedMarketerPayout(payout: { method: string; bankName: string | null; accountNameEncrypted: string; accountNumberEncrypted: string; ibanEncrypted: string | null }) {
  return { method: payout.method, bankName: payout.bankName, accountName: maskSecret(decryptSecret(payout.accountNameEncrypted)), accountNumber: maskSecret(decryptSecret(payout.accountNumberEncrypted)), iban: payout.ibanEncrypted ? maskSecret(decryptSecret(payout.ibanEncrypted)) : null };
}

function payoutData(input: { method: string; bankName?: string; accountName: string; accountNumber: string; iban?: string }) { return { method: input.method as never, bankName: input.bankName?.trim() || null, accountNameEncrypted: encryptSecret(input.accountName.trim()), accountNumberEncrypted: encryptSecret(input.accountNumber.trim()), ibanEncrypted: input.iban?.trim() ? encryptSecret(input.iban.trim()) : null }; }
function verificationData(input: { legalName: string; documentType: 'NATIONAL_ID' | 'PASSPORT'; documentNumber: string; expiresAt: Date }) { const number = input.documentNumber.replace(/\s+/g, '').toUpperCase(); if (!/^[A-Z0-9-]{5,40}$/.test(number)) throw new ValidationError('رقم الهوية أو الجواز غير صالح'); return { legalName: input.legalName.trim(), documentType: input.documentType as never, documentNumberEncrypted: encryptSecret(number), expiresAt: input.expiresAt, status: 'PENDING' as const, submittedAt: new Date(), reviewedById: null, reviewedAt: null, rejectionReason: null }; }
