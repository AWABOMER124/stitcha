import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { UnauthorizedError } from '@/lib/errors';
import type { CustomerAccount } from '@prisma/client';

const ACCESS_TOKEN_TTL = '15m';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

async function signAccessToken(accountId: string, sessionId: string) {
  return new SignJWT({ sub: accountId, sid: sessionId, typ: 'customer-access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey());
}

export interface CustomerTokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/** Creates a new independently revocable mobile session. */
export async function issueCustomerSession(
  accountId: string,
  familyId: string = crypto.randomUUID(),
): Promise<CustomerTokenPair> {
  const refreshToken = newRefreshToken();
  const session = await prisma.customerRefreshSession.create({
    data: {
      accountId,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    token: await signAccessToken(accountId, session.id),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/** Rotates a refresh token once. Reuse revokes the complete token family. */
export async function rotateCustomerSession(refreshToken: string): Promise<{
  account: CustomerAccount;
  tokens: CustomerTokenPair;
}> {
  const current = await prisma.customerRefreshSession.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { account: true },
  });

  if (!current) throw new UnauthorizedError('Invalid refresh token');

  if (current.revokedAt) {
    await prisma.customerRefreshSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected');
  }

  if (current.expiresAt <= new Date()) {
    await prisma.customerRefreshSession.update({
      where: { id: current.id },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token expired');
  }

  const nextRefreshToken = newRefreshToken();
  const next = await prisma.$transaction(async (tx) => {
    const claimed = await tx.customerRefreshSession.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (claimed.count !== 1) {
      await tx.customerRefreshSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    return tx.customerRefreshSession.create({
      data: {
        accountId: current.accountId,
        familyId: current.familyId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
  });

  if (!next) throw new UnauthorizedError('Refresh token reuse detected');

  return {
    account: current.account,
    tokens: {
      token: await signAccessToken(current.accountId, next.id),
      refreshToken: nextRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
  };
}

function bearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing bearer token');
  }
  return token;
}

async function verifiedAccessClaims(req: NextRequest) {
  try {
    const { payload } = await jwtVerify(bearerToken(req), getSecretKey());
    if (
      payload.typ !== 'customer-access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      throw new Error('Wrong token type');
    }
    return { accountId: payload.sub, sessionId: payload.sid };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/** Verifies the access token and its server-side session revocation state. */
export async function requireCustomerAuth(req: NextRequest): Promise<CustomerAccount> {
  const { accountId, sessionId } = await verifiedAccessClaims(req);
  const session = await prisma.customerRefreshSession.findUnique({
    where: { id: sessionId },
    include: { account: true },
  });

  if (
    !session ||
    session.accountId !== accountId ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new UnauthorizedError('Session is no longer active');
  }

  return session.account;
}

/** Revokes the refresh session backing the current access token. */
export async function revokeCurrentCustomerSession(req: NextRequest): Promise<void> {
  const { accountId, sessionId } = await verifiedAccessClaims(req);
  await prisma.customerRefreshSession.updateMany({
    where: { id: sessionId, accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
