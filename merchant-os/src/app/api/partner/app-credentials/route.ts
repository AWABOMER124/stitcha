import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { encryptSecret } from '@/lib/crypto/secret';
import { resolvePublicOrigin } from '@/lib/public-origin';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== resolvePublicOrigin(request.headers)) return Response.json({ error: 'طلب غير مسموح' }, { status: 403 });
  const { partnerId } = await requireDeliveryPartner({ verified: true });
  const current = await prisma.deliveryPartnerProviderConfig.findUnique({ where: { partnerId } });
  const clientId = current?.clientId ?? `wsl_app_${randomBytes(12).toString('hex')}`;
  const clientSecret = `wsl_secret_${randomBytes(32).toString('base64url')}`;
  const webhookSecret = `whsec_${randomBytes(32).toString('base64url')}`;
  await prisma.deliveryPartnerProviderConfig.upsert({
    where: { partnerId },
    create: { partnerId, providerKey: 'PARTNER_HTTP_V1', integrationMode: 'APP_V1', clientId,
      clientSecretHash: await hash(clientSecret, 12), webhookSigningSecret: encryptSecret(webhookSecret),
      subscribedEvents: ['shipment.created', 'shipment.cancelled'], isActive: false },
    update: { integrationMode: 'APP_V1', clientId, clientSecretHash: await hash(clientSecret, 12),
      webhookSigningSecret: encryptSecret(webhookSecret), subscribedEvents: ['shipment.created', 'shipment.cancelled'], isActive: current?.isActive ?? false },
  });
  return Response.json({ clientId, clientSecret, webhookSecret,
    warning: 'هذه القيم السرية تظهر مرة واحدة. خزّنها في مدير أسرار آمن.' });
}
