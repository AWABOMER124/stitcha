import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { privateStorageService } from '@/services/storage';

export type MerchantPaymentAccountInput = {
  channel: 'BANKAK' | 'MYCASHY' | 'OTHER';
  label: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
  sortOrder?: number;
};

export async function listMerchantPaymentAccounts(merchantId: string, activeOnly = false) {
  return prisma.merchantPaymentAccount.findMany({
    where: { merchantId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, channel: true, label: true, accountName: true, accountNumber: true, instructions: true, isActive: true, sortOrder: true },
  });
}

export async function createMerchantPaymentAccount(merchantId: string, input: MerchantPaymentAccountInput) {
  return prisma.merchantPaymentAccount.create({
    data: {
      merchantId,
      channel: input.channel,
      label: input.label.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      instructions: input.instructions?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function setMerchantPaymentAccountActive(merchantId: string, id: string, isActive: boolean) {
  const updated = await prisma.merchantPaymentAccount.updateMany({ where: { id, merchantId }, data: { isActive } });
  if (updated.count !== 1) throw new NotFoundError('Payment account');
  return { success: true };
}

export async function reviewOrderPayment(merchantId: string, paymentId: string, reviewerId: string, decision: 'VERIFY' | 'REJECT', reason?: string) {
  if (decision === 'REJECT' && !reason?.trim()) throw new ValidationError('Rejection reason is required');
  const now = new Date();
  return prisma.$transaction(async tx => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, order: { merchantId } }, include: { manualProof: true } });
    if (!payment?.manualProof) throw new NotFoundError('Payment proof');
    if (payment.manualProof.status !== 'PENDING') throw new ConflictError('Payment proof was already reviewed');

    const nextProofStatus = decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const claimed = await tx.orderPaymentProof.updateMany({
      where: { id: payment.manualProof.id, status: 'PENDING' },
      data: { status: nextProofStatus, reviewedById: reviewerId, reviewedAt: now, rejectionReason: decision === 'REJECT' ? reason!.trim() : null },
    });
    if (claimed.count !== 1) throw new ConflictError('Payment proof was already reviewed');

    await tx.payment.update({
      where: { id: payment.id },
      data: decision === 'VERIFY'
        ? { status: 'COMPLETED', paidAt: payment.manualProof.transferredAt ?? now, transactionRef: payment.manualProof.transactionRef }
        : { status: 'FAILED' },
    });
    return { success: true };
  });
}

export async function getOrderPaymentProof(paymentId: string, merchantId: string) {
  const proof = await prisma.orderPaymentProof.findFirst({ where: { paymentId, merchantId }, select: { proofStorageKey: true } });
  if (!proof) throw new NotFoundError('Payment proof');
  return privateStorageService.download(proof.proofStorageKey);
}
