import { beforeEach, describe, expect, it, vi } from 'vitest';

const txMock = {
  aiUsageBucket: { upsert: vi.fn(), update: vi.fn() },
  aiUsageOperation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
};
const transactionMock = vi.fn(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
vi.mock('@/lib/db/prisma', () => ({ default: { ...txMock, $transaction: transactionMock } }));

const {
  AI_FEATURE_KEYS,
  aiUsagePeriodKey,
  commitAiUsage,
  expireAiUsageReservations,
  releaseAiUsage,
  reserveAiUsage,
  runMeteredAiOperation,
} = await import('./ai-usage.service');

describe('AI usage accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it('builds stable UTC monthly and lifetime period keys', () => {
    const now = new Date('2026-09-30T23:59:59Z');
    expect(aiUsagePeriodKey('MONTHLY', now)).toBe('2026-09');
    expect(aiUsagePeriodKey('LIFETIME', now)).toBe('lifetime');
  });

  it('reserves capacity and stores an idempotent operation', async () => {
    txMock.aiUsageOperation.findUnique.mockResolvedValue(null);
    txMock.aiUsageBucket.upsert.mockResolvedValue({
      id: 'bucket_1', periodKey: '2026-09', usedUnits: 2, reservedUnits: 0, limitSnapshot: 5,
    });
    txMock.aiUsageBucket.update.mockResolvedValue({
      id: 'bucket_1', periodKey: '2026-09', usedUnits: 2, reservedUnits: 1, limitSnapshot: 5,
    });
    txMock.aiUsageOperation.create.mockResolvedValue({
      id: 'operation_1', merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY,
      status: 'RESERVED', units: 1,
    });

    await expect(reserveAiUsage({
      merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY,
      period: 'MONTHLY', limit: 5, idempotencyKey: 'request_1',
    })).resolves.toMatchObject({ operationId: 'operation_1', reservedUnits: 1, limit: 5 });
    expect(txMock.aiUsageBucket.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reservedUnits: { increment: 1 } }),
    }));
  });

  it('returns the original reservation for the same idempotency key', async () => {
    txMock.aiUsageOperation.findUnique.mockResolvedValue({
      id: 'operation_1', merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_LIFETIME,
      status: 'COMMITTED', units: 1,
      bucket: { periodKey: 'lifetime', usedUnits: 1, reservedUnits: 0, limitSnapshot: 1 },
    });

    await expect(reserveAiUsage({
      merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_LIFETIME,
      period: 'LIFETIME', limit: 1, idempotencyKey: 'request_1',
    })).resolves.toMatchObject({ status: 'COMMITTED', usedUnits: 1 });
    expect(txMock.aiUsageBucket.upsert).not.toHaveBeenCalled();
  });

  it('rejects a reservation when used and pending units reach the limit', async () => {
    txMock.aiUsageOperation.findUnique.mockResolvedValue(null);
    txMock.aiUsageBucket.upsert.mockResolvedValue({
      id: 'bucket_1', periodKey: '2026-09', usedUnits: 4, reservedUnits: 1, limitSnapshot: 5,
    });

    await expect(reserveAiUsage({
      merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY,
      period: 'MONTHLY', limit: 5, idempotencyKey: 'request_2',
    })).rejects.toThrow('استهلكت الحد المتاح');
    expect(txMock.aiUsageOperation.create).not.toHaveBeenCalled();
  });

  it('commits a reservation and records provider usage', async () => {
    txMock.aiUsageOperation.findUnique.mockResolvedValue({
      id: 'operation_1', bucketId: 'bucket_1', units: 1, status: 'RESERVED',
    });

    await commitAiUsage('operation_1', { provider: 'ai-core', inputTokens: 20, outputTokens: 30 });

    expect(txMock.aiUsageBucket.update).toHaveBeenCalledWith({
      where: { id: 'bucket_1' },
      data: { reservedUnits: { decrement: 1 }, usedUnits: { increment: 1 } },
    });
    expect(txMock.aiUsageOperation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMMITTED', provider: 'ai-core', inputTokens: 20 }),
    }));
  });

  it('releases quota after a failed provider call', async () => {
    txMock.aiUsageOperation.findUnique.mockResolvedValue({
      id: 'operation_1', bucketId: 'bucket_1', units: 1, status: 'RESERVED',
    });

    await releaseAiUsage('operation_1', { code: 'UPSTREAM_FAILED', message: 'provider failed' });

    expect(txMock.aiUsageBucket.update).toHaveBeenCalledWith({
      where: { id: 'bucket_1' }, data: { reservedUnits: { decrement: 1 } },
    });
    expect(txMock.aiUsageOperation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'RELEASED', failureCode: 'UPSTREAM_FAILED' }),
    }));
  });

  it('automatically releases quota when a metered execution fails', async () => {
    txMock.aiUsageOperation.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'operation_1', bucketId: 'bucket_1', units: 1, status: 'RESERVED' });
    txMock.aiUsageBucket.upsert.mockResolvedValue({
      id: 'bucket_1', periodKey: '2026-09', usedUnits: 0, reservedUnits: 0, limitSnapshot: 5,
    });
    txMock.aiUsageBucket.update.mockResolvedValue({
      id: 'bucket_1', periodKey: '2026-09', usedUnits: 0, reservedUnits: 1, limitSnapshot: 5,
    });
    txMock.aiUsageOperation.create.mockResolvedValue({
      id: 'operation_1', merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY,
      status: 'RESERVED', units: 1,
    });

    await expect(runMeteredAiOperation({
      merchantId: 'merchant_1', featureKey: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY,
      period: 'MONTHLY', limit: 5, idempotencyKey: 'request_3',
    }, async () => { throw new Error('provider failed'); })).rejects.toThrow('provider failed');

    expect(txMock.aiUsageOperation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'RELEASED' }),
    }));
  });

  it('expires abandoned reservations without double releasing them', async () => {
    txMock.aiUsageOperation.findMany.mockResolvedValue([
      { id: 'operation_1', bucketId: 'bucket_1', units: 1 },
      { id: 'operation_2', bucketId: 'bucket_1', units: 2 },
    ]);
    txMock.aiUsageOperation.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(expireAiUsageReservations(new Date('2026-09-04T10:00:00Z'))).resolves.toBe(1);
    expect(txMock.aiUsageBucket.update).toHaveBeenCalledTimes(1);
    expect(txMock.aiUsageBucket.update).toHaveBeenCalledWith({
      where: { id: 'bucket_1' }, data: { reservedUnits: { decrement: 1 } },
    });
  });
});
