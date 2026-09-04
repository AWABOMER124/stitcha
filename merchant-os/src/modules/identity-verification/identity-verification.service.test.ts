import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = {
  merchantIdentityVerification: { upsert: vi.fn() },
  merchantIdentityDocument: { deleteMany: vi.fn(), createMany: vi.fn() },
};
const prismaMock = {
  merchantIdentityVerification: { findUnique: vi.fn() },
  merchantIdentityDocument: { findMany: vi.fn() },
  $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
};
const storageMock = { upload: vi.fn(), delete: vi.fn(), download: vi.fn() };

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/services/storage', () => ({ privateStorageService: storageMock }));
vi.mock('@/services/storage/private-evidence-input', () => ({
  normalizePrivateEvidence: vi.fn(async () => ({
    buffer: Buffer.from('valid-image'), filename: 'identity.jpg', mimeType: 'image/jpeg', sha256: 'sha256',
  })),
}));

const { submitMerchantIdentity } = await import('./identity-verification.service');

describe('merchant identity verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRETS_ENCRYPTION_KEY = 'test-only-encryption-key-with-safe-length';
    prismaMock.merchantIdentityVerification.findUnique.mockResolvedValue(null);
    prismaMock.merchantIdentityDocument.findMany.mockResolvedValue([]);
    tx.merchantIdentityVerification.upsert.mockResolvedValue({ id: 'verification_1' });
    tx.merchantIdentityDocument.deleteMany.mockResolvedValue({ count: 0 });
    tx.merchantIdentityDocument.createMany.mockResolvedValue({ count: 1 });
    storageMock.upload.mockResolvedValue('private/merchant-1-kyc/identity.jpg');
    storageMock.delete.mockResolvedValue(undefined);
  });

  it('stores the document privately and creates a pending admin review', async () => {
    const file = new File([Buffer.from('valid-image')], 'front.jpg', { type: 'image/jpeg' });

    await submitMerchantIdentity('merchant-1', {
      legalName: 'Test Merchant', documentType: 'NATIONAL_ID', documentNumber: 'ID-12345', expiresAt: new Date('2035-01-01'),
    }, file);

    expect(storageMock.upload).toHaveBeenCalledWith(expect.any(Buffer), 'identity.jpg', 'image/jpeg', 'merchant-merchant-1-kyc');
    expect(tx.merchantIdentityVerification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ merchantId: 'merchant-1', status: 'PENDING', documentNumberEncrypted: expect.any(String) }),
    }));
    expect(tx.merchantIdentityDocument.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ verificationId: 'verification_1', side: 'FRONT', storageKey: 'private/merchant-1-kyc/identity.jpg' })],
    });
  });

  it('deletes newly uploaded private files when the database transaction fails', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error('database unavailable'));
    const file = new File([Buffer.from('valid-image')], 'front.jpg', { type: 'image/jpeg' });

    await expect(submitMerchantIdentity('merchant-1', {
      legalName: 'Test Merchant', documentType: 'PASSPORT', documentNumber: 'P-12345', expiresAt: new Date('2035-01-01'),
    }, file)).rejects.toThrow('database unavailable');

    expect(storageMock.delete).toHaveBeenCalledWith('private/merchant-1-kyc/identity.jpg');
  });
});
