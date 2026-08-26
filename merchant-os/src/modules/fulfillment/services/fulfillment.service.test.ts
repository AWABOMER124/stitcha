import { beforeEach, describe, expect, it, vi } from 'vitest';

const repoMock = { findOrderById: vi.fn(), advanceOrderStatus: vi.fn() };
vi.mock('../repositories/fulfillment.repository', () => repoMock);

const { advanceStatus } = await import('./fulfillment.service');

describe('manual payment fulfillment gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks accepting an order while transfer proof is pending', async () => {
    repoMock.findOrderById.mockResolvedValue({ status: 'NEW', paymentMethod: 'MANUAL_TRANSFER', payment: { status: 'PENDING' } });
    await expect(advanceStatus('merchant_1', 'order_1', 'ACCEPTED', undefined, 'user_1')).rejects.toThrow('يجب مطابقة إشعار التحويل');
    expect(repoMock.advanceOrderStatus).not.toHaveBeenCalled();
  });

  it('allows acceptance after the transfer is verified', async () => {
    repoMock.findOrderById.mockResolvedValue({ status: 'NEW', paymentMethod: 'MANUAL_TRANSFER', payment: { status: 'COMPLETED' } });
    repoMock.advanceOrderStatus.mockResolvedValue({ id: 'order_1', status: 'ACCEPTED' });
    await expect(advanceStatus('merchant_1', 'order_1', 'ACCEPTED', undefined, 'user_1')).resolves.toMatchObject({ status: 'ACCEPTED' });
    expect(repoMock.advanceOrderStatus).toHaveBeenCalledOnce();
  });
});
