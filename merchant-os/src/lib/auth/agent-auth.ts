import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

const KEY_PREFIX = 'wsk_live_';
const PREFIX_DISPLAY_LEN = KEY_PREFIX.length + 8;

export type AgentScope = 'stores:draft' | 'merchants:read' | 'orders:read';

export interface AgentAuthContext {
  distributorId: string;
  apiKeyId: string;
  scopes: string[];
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** Generates a new raw API key. Only the caller sees the plaintext — store `hashKey(raw)` instead. */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, PREFIX_DISPLAY_LEN) };
}

/**
 * Verifies the `Authorization: Bearer wsk_live_...` header for external
 * agent integrations, distinct from the staff NextAuth session and the
 * Flutter app's customer JWT (see customer-session.ts). Throws
 * UnauthorizedError/ForbiddenError on any failure.
 */
export async function requireAgentAuth(req: NextRequest, requiredScope: AgentScope): Promise<AgentAuthContext> {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, rawKey] = header.split(' ');
  if (scheme !== 'Bearer' || !rawKey) {
    throw new UnauthorizedError('Missing API key');
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashKey(rawKey) } });
  if (!apiKey || apiKey.revokedAt) {
    throw new UnauthorizedError('Invalid or revoked API key');
  }

  if (!apiKey.scopes.includes(requiredScope)) {
    throw new ForbiddenError(`API key is missing the required scope: ${requiredScope}`);
  }

  // Best-effort — a failed timestamp update shouldn't block the request it's tracking.
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { distributorId: apiKey.distributorId, apiKeyId: apiKey.id, scopes: apiKey.scopes };
}
