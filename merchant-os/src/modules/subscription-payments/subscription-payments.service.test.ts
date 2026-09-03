import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  merchantSubscriptionPayment: { findUnique: vi.fn(), updateMany: vi.fn() },
  merchantSubscription: { upsert: vi.fn() },
  merchantPlanChangeRequest: { update: vi.fn() },
  merchantReferral: { findUnique: vi.fn() },
};
const prismaMock = {
  platformPaymentAccount: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  merchantPlanChangeRequest: { findFirst: vi.fn() },
  merchantSubscriptionPayment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};
const privateStorageMock = { upload: vi.fn(), download: vi.fn(), delete: vi.fn() };

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/services/storage', () => ({ privateStorageService: privateStorageMock }));

const {
  createPlatformPaymentAccount,
  reviewSubscriptionPayment,
  setPlatformPaymentAccountActive,
  submitManualSubscriptionPayment,
} = await import('./subscription-payments.service');

const evidence = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
  filename: 'receipt.jpg',
  mimeType: 'image/jpeg' as const,
  sha256: 'hash_1',
};

describe('manual subscription payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.merchantReferral.findUnique.mockResolvedValue(null);
    privateStorageMock.upload.mockResolvedValue('private/merchant_1-subscription-payments/receipt.jpg');
    privateStorageMock.delete.mockResolvedValue(undefined);
  });

  it('creates a payment account with normalized display data', async () => {
    prismaMock.platformPaymentAccount.create.mockResolvedValue({ id: 'account_1' });
    await createPlatformPaymentAccount({ channel: 'BANKAK', label: ' بنكك ', accountName: ' وصلة ', accountNumber: ' 123 ', monthlyAmount: 25_000, currency: 'sdg' });
    expect(prismaMock.platformPaymentAccount.create).toHaveBeenCalledWith({ data: expect.objectContaining({ label: 'بنكك', accountName: 'وصلة', accountNumber: '123', monthlyAmount: 25_000, currency: 'SDG' }) });
  });

  it('refuses to toggle an unknown account', async () => {
    prismaMock.platformPaymentAccount.findUnique.mockResolvedValue(null);
    await expect(setPlatformPaymentAccountActive('missing', false)).rejects.toThrow('Payment account not found');
  });

  it('locks amount and channel from the active platform account, never from the browser', async () => {
    prismaMock.platformPaymentAccount.findFirst.mockResolvedValue({ id: 'account_1', monthlyAmount: 25_000, currency: 'SDG', channel: 'BANKAK' });
    prismaMock.merchantPlanChangeRequest.findFirst.mockResolvedValue({ id: 'request_1', targetPlanId: 'plan_pro' });
    prismaMock.merchantSubscriptionPayment.findFirst.mockResolvedValue(null);
    prismaMock.merchantSubscriptionPayment.create.mockResolvedValue({ id: 'payment_1', status: 'PENDING' });

    await submitManualSubscriptionPayment('merchant_1', { paymentAccountId: 'account_1', transactionRef: ' ab-123 ', senderName: 'Ali' }, evidence);

    expect(prismaMock.merchantSubscriptionPayment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 25_000, currency: 'SDG', channel: 'BANKAK', transactionRef: 'AB-123', proofStorageKey: expect.stringMatching(/^private\//) }),
    }));
  });

  it('deletes private evidence if the database rejects a duplicate receipt', async () => {
    prismaMock.platformPaymentAccount.findFirst.mockResolvedValue({ id: 'account_1', monthlyAmount: 25_000, currency: 'SDG', channel: 'BANKAK' });
    prismaMock.merchantPlanChangeRequest.findFirst.mockResolvedValue({ id: 'request_1', targetPlanId: 'plan_pro' });
    prismaMock.merchantSubscriptionPayment.findFirst.mockResolvedValue(null);
    prismaMock.merchantSubscriptionPayment.create.mockRejectedValue({ code: 'P2002' });

    await expect(submitManualSubscriptionPayment('merchant_1', { paymentAccountId: 'account_1', transactionRef: 'AB-123' }, evidence)).rejects.toThrow('already submitted');
    expect(privateStorageMock.delete).toHaveBeenCalledOnce();
  });

  it('activates the paid plan only after owner verification', async () => {
    txMock.merchantSubscriptionPayment.findUnique.mockResolvedValue({ id: 'payment_1', merchantId: 'merchant_1', targetPlanId: 'plan_pro', planChangeRequestId: 'request_1', status: 'PENDING', amount: 25_000, currency: 'SDG' });
    txMock.merchantSubscription.upsert.mockResolvedValue({});
    txMock.merchantSubscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    txMock.merchantPlanChangeRequest.update.mockResolvedValue({});

    await reviewSubscriptionPayment('payment_1', 'owner_1', 'VERIFY');

    expect(txMock.merchantSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ planId: 'plan_pro', status: 'ACTIVE', priceOverride: 25_000, currencyOverride: 'SDG' }) }));
    expect(txMock.merchantSubscriptionPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }), data: expect.objectContaining({ status: 'VERIFIED', reviewedById: 'owner_1' }) }));
    expect(txMock.merchantPlanChangeRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }));
  });

  it('requires a reason when rejecting a payment', async () => {
    txMock.merchantSubscriptionPayment.findUnique.mockResolvedValue({ id: 'payment_1', status: 'PENDING' });
    await expect(reviewSubscriptionPayment('payment_1', 'owner_1', 'REJECT', ' ')).rejects.toThrow('Rejection reason is required');
    expect(txMock.merchantSubscriptionPayment.updateMany).not.toHaveBeenCalled();
  });
});
