import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, UnauthorizedError } from '@/lib/errors';

const findUnique = vi.fn();
const create = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  default: {
    customerAccount: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

const issueCustomerSession = vi.fn(async (accountId: string) => ({
  token: `fake-token-for-${accountId}`,
  refreshToken: `fake-refresh-for-${accountId}`,
  expiresIn: 900,
}));
const rotateCustomerSession = vi.fn();

vi.mock('@/lib/auth/customer-session', () => ({
  issueCustomerSession,
  rotateCustomerSession,
}));

const { register, login, refresh } = await import('./customer-auth.service');

describe('customer-auth.service', () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    issueCustomerSession.mockClear();
    rotateCustomerSession.mockReset();
  });

  describe('register', () => {
    it('rejects a phone number that is already registered', async () => {
      findUnique.mockResolvedValue({ id: 'acc_1', phone: '0912345678' });

      await expect(
        register({ name: 'Ahmed', phone: '0912345678', password: 'secret1' })
      ).rejects.toThrow(ConflictError);

      expect(create).not.toHaveBeenCalled();
    });

    it('hashes the password and creates the account for a new phone number', async () => {
      findUnique.mockResolvedValue(null);
      create.mockImplementation(async ({ data }: { data: { name: string; phone: string; passwordHash: string } }) => ({
        id: 'acc_new',
        ...data,
      }));

      const result = await register({ name: 'Sara', phone: '0911111111', password: 'secret1' });

      expect(create).toHaveBeenCalledTimes(1);
      const createdData = create.mock.calls[0][0].data;
      expect(createdData.passwordHash).not.toBe('secret1');
      expect(createdData.passwordHash.length).toBeGreaterThan(20);

      expect(result).toEqual({
        id: 'acc_new',
        name: 'Sara',
        phone: '0911111111',
        token: 'fake-token-for-acc_new',
        refreshToken: 'fake-refresh-for-acc_new',
        expiresIn: 900,
      });
    });
  });

  describe('login', () => {
    it('rejects an unknown phone number', async () => {
      findUnique.mockResolvedValue(null);
      await expect(login({ phone: '0900000000', password: 'whatever' })).rejects.toThrow(UnauthorizedError);
    });

    it('rejects a wrong password', async () => {
      // bcrypt hash of "correct-password"
      findUnique.mockResolvedValue({
        id: 'acc_2',
        name: 'Omar',
        phone: '0922222222',
        passwordHash: await (await import('bcryptjs')).hash('correct-password', 10),
      });

      await expect(login({ phone: '0922222222', password: 'wrong-password' })).rejects.toThrow(UnauthorizedError);
    });

    it('logs in with the correct password', async () => {
      const passwordHash = await (await import('bcryptjs')).hash('correct-password', 10);
      findUnique.mockResolvedValue({ id: 'acc_3', name: 'Layla', phone: '0933333333', passwordHash });

      const result = await login({ phone: '0933333333', password: 'correct-password' });
      expect(result).toEqual({
        id: 'acc_3',
        name: 'Layla',
        phone: '0933333333',
        token: 'fake-token-for-acc_3',
        refreshToken: 'fake-refresh-for-acc_3',
        expiresIn: 900,
      });
    });
  });

  it('maps a rotated refresh session back to the mobile auth contract', async () => {
    rotateCustomerSession.mockResolvedValue({
      account: { id: 'acc_4', name: 'Mona', phone: '0999999999' },
      tokens: { token: 'next-access', refreshToken: 'next-refresh', expiresIn: 900 },
    });

    await expect(refresh('old-refresh')).resolves.toEqual({
      id: 'acc_4',
      name: 'Mona',
      phone: '0999999999',
      token: 'next-access',
      refreshToken: 'next-refresh',
      expiresIn: 900,
    });
  });
});
