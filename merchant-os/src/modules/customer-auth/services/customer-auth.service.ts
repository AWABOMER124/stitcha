import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  issueCustomerSession,
  rotateCustomerSession,
} from '@/lib/auth/customer-session';
import type { RegisterInput, LoginInput } from '../schemas/customer-auth.schemas';

export interface CustomerAuthResult {
  id: string;
  name: string;
  phone: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

function authResult(
  account: { id: string; name: string; phone: string },
  tokens: { token: string; refreshToken: string; expiresIn: number },
): CustomerAuthResult {
  return { id: account.id, name: account.name, phone: account.phone, ...tokens };
}

export async function register(input: RegisterInput): Promise<CustomerAuthResult> {
  const existing = await prisma.customerAccount.findUnique({ where: { phone: input.phone } });
  if (existing) throw new ConflictError('رقم الهاتف مسجل بالفعل');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const account = await prisma.customerAccount.create({
    data: { name: input.name, phone: input.phone, passwordHash },
  });

  return authResult(account, await issueCustomerSession(account.id));
}

export async function login(input: LoginInput): Promise<CustomerAuthResult> {
  const account = await prisma.customerAccount.findUnique({ where: { phone: input.phone } });
  if (!account) throw new UnauthorizedError('رقم الهاتف أو كلمة المرور غير صحيحة');

  const isValid = await bcrypt.compare(input.password, account.passwordHash);
  if (!isValid) throw new UnauthorizedError('رقم الهاتف أو كلمة المرور غير صحيحة');

  return authResult(account, await issueCustomerSession(account.id));
}

export async function refresh(refreshToken: string): Promise<CustomerAuthResult> {
  const rotated = await rotateCustomerSession(refreshToken);
  return authResult(rotated.account, rotated.tokens);
}

/** Stores/updates the FCM device token for push notifications. */
export async function updateDeviceToken(accountId: string, fcmToken: string): Promise<void> {
  await prisma.customerAccount.update({ where: { id: accountId }, data: { fcmToken } });
}
