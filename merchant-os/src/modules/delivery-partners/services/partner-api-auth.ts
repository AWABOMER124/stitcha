import { compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/db/prisma';
import { UnauthorizedError } from '@/lib/errors';

const issuer = 'wasla';
const audience = 'delivery-partner-api';

function key() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) throw new Error('AUTH_SECRET is not configured');
  return new TextEncoder().encode(value);
}

export async function issuePartnerAccessToken(clientId: string, clientSecret: string) {
  const config = await prisma.deliveryPartnerProviderConfig.findUnique({ where: { clientId }, include: { partner: true } });
  if (!config?.clientSecretHash || !config.isActive || config.integrationMode !== 'APP_V1' || !config.partner.isActive || config.partner.status !== 'ACTIVE') {
    throw new UnauthorizedError('Invalid client credentials');
  }
  if (!(await compare(clientSecret, config.clientSecretHash))) throw new UnauthorizedError('Invalid client credentials');
  const expiresIn = 900;
  const accessToken = await new SignJWT({ typ: 'partner-access', partnerId: config.partnerId, scope: 'shipping.read_write' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setAudience(audience).setSubject(config.partnerId)
    .setIssuedAt().setExpirationTime(`${expiresIn}s`).sign(key());
  return { accessToken, expiresIn };
}

export async function authenticatePartnerApi(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError('Missing access token');
  try {
    const { payload } = await jwtVerify(token, key(), { issuer, audience });
    if (payload.typ !== 'partner-access' || typeof payload.partnerId !== 'string' || payload.sub !== payload.partnerId) throw new Error('invalid claims');
    return { partnerId: payload.partnerId, scope: String(payload.scope ?? '') };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
