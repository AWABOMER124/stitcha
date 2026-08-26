import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  payment: { findFirst: vi.fn(), update: vi.fn() },
  orderPaymentProof: { updateMany: vi.fn() },
};
const prismaMock = {
  merchantPaymentAccount: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  orderPaymentProof: { findFirst: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};
const privateStorageMock = { download: vi.fn() };

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/services/storage', () => ({ privateStorageService: privateStorageMock }));

const {
  createMerchantPaymentAccount,
  getOrderPaymentProof,
  reviewOrderPayment,
  setMerchantPaymentAccountActive,
} = await import('./store-payments.service');

describe('merchant storefront payment accounts and review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always scopes account updates to the authenticated merchant', async () => {
    prismaMock.merchantPaymentAccount.updateMany.mockResolvedValue({ count: 1 });
    await setMerchantPaymentAccountActive('merchant_1', 'account_1', false);
    expect(prismaMock.merchantPaymentAccount.updateMany).toHaveBeenCalledWith({ where: { id: 'account_1', merchantId: 'merchant_1' }, data: { isActive: false } });
  });

  it('normalizes account details while retaining the merchant boundary', async () => {
    prismaMock.merchantPaymentAccount.create.mockResolvedValue({ id: 'account_1' });
    await createMerchantPaymentAccount('merchant_1', { channel: 'MYCASHY', label: ' ماي كاشي ', accountName: ' متجر ', accountNumber: ' 999 ' });
    expect(prismaMock.merchantPaymentAccount.create).toHaveBeenCalledWith({ data: expect.objectContaining({ merchantId: 'merchant_1', label: 'ماي كاشي', accountName: 'متجر', accountNumber: '999' }) });
  });

  it('atomically verifies proof and completes the matching payment', async () => {
    txMock.payment.findFirst.mockResolvedValue({ id: 'payment_1', manualProof: { id: 'proof_1', status: 'PENDING', transactionRef: 'REF-1', transferredAt: null } });
    txMock.orderPaymentProof.updateMany.mockResolvedValue({ count: 1 });
    txMock.payment.update.mockResolvedValue({});
    await reviewOrderPayment('merchant_1', 'payment_1', 'user_1', 'VERIFY');
    expect(txMock.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'payment_1', order: { merchantId: 'merchant_1' } } }));
    expect(txMock.orderPaymentProof.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'proof_1', status: 'PENDING' }, data: expect.objectContaining({ status: 'VERIFIED' }) }));
    expect(txMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', transactionRef: 'REF-1' }) }));
  });

  it('requires a reason before rejecting proof', async () => {
    await expect(reviewOrderPayment('merchant_1', 'payment_1', 'user_1', 'REJECT', '')).rejects.toThrow('Rejection reason is required');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('never downloads proof across merchant boundaries', async () => {
    prismaMock.orderPaymentProof.findFirst.mockResolvedValue(null);
    await expect(getOrderPaymentProof('payment_1', 'merchant_wrong')).rejects.toThrow('Payment proof not found');
    expect(privateStorageMock.download).not.toHaveBeenCalled();
  });
});
