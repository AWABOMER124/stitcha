import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { ConflictError, UnauthorizedError } from '@/lib/errors';
import { signCustomerToken } from '@/lib/auth/customer-session';
import type { RegisterInput, LoginInput } from '../schemas/customer-auth.schemas';

export interface CustomerAuthResult {
  id: string;
  name: string;
  phone: string;
  token: string;
}

export async function register(input: RegisterInput): Promise<CustomerAuthResult> {
  const existing = await prisma.customerAccount.findUnique({ where: { phone: input.phone } });
  if (existing) throw new ConflictError('رقم الهاتف مسجل بالفعل');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const account = await prisma.customerAccount.create({
    data: { name: input.name, phone: input.phone, passwordHash },
  });

  const token = await signCustomerToken(account.id);
  return { id: account.id, name: account.name, phone: account.phone, token };
}

export async function login(input: LoginInput): Promise<CustomerAuthResult> {
  const account = await prisma.customerAccount.findUnique({ where: { phone: input.phone } });
  if (!account) throw new UnauthorizedError('رقم الهاتف أو كلمة المرور غير صحيحة');

  const isValid = await bcrypt.compare(input.password, account.passwordHash);
  if (!isValid) throw new UnauthorizedError('رقم الهاتف أو كلمة المرور غير صحيحة');

  const token = await signCustomerToken(account.id);
  return { id: account.id, name: account.name, phone: account.phone, token };
}

/** Stores/updates the FCM device token for push notifications. */
export async function updateDeviceToken(accountId: string, fcmToken: string): Promise<void> {
  await prisma.customerAccount.update({ where: { id: accountId }, data: { fcmToken } });
}
