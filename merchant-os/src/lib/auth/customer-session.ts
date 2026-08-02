import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { UnauthorizedError } from '@/lib/errors';
import type { CustomerAccount } from '@prisma/client';

const TOKEN_TTL = '90d';

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

/** Signs a long-lived bearer token for the Flutter app, carrying only the account id. */
export async function signCustomerToken(accountId: string): Promise<string> {
  return new SignJWT({ sub: accountId, typ: 'customer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}

/** Verifies the `Authorization: Bearer` header and loads the CustomerAccount. Throws UnauthorizedError on any failure. */
export async function requireCustomerAuth(req: NextRequest): Promise<CustomerAccount> {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing bearer token');
  }

  let accountId: string;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.typ !== 'customer' || typeof payload.sub !== 'string') {
      throw new Error('Wrong token type');
    }
    accountId = payload.sub;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const account = await prisma.customerAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new UnauthorizedError('Account no longer exists');

  return account;
}
