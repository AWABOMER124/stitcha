import prisma from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const storage = process.env.S3_BUCKET
      ? { provider: 's3', durabilityDeclared: true }
      : { provider: 'local', durabilityDeclared: process.env.PUBLIC_UPLOADS_PERSISTENT === 'true' };

    const release = process.env.APP_RELEASE?.trim() || 'unknown';
    const checks = {
      database: true,
      releaseIdentified: release !== 'unknown' && release !== 'local',
      durableStorage: storage.durabilityDeclared,
      emailDelivery: configured(process.env.RESEND_API_KEY) && configured(process.env.EMAIL_FROM),
      aiCore: configured(process.env.AI_CORE_BASE_URL) && configured(process.env.AI_CORE_SECRET_WASLA),
      imageEnhancement: process.env.AI_IMAGE_ENHANCEMENT_ENABLED !== 'true'
        || (configured(process.env.AI_CORE_BASE_URL) && configured(process.env.AI_CORE_SECRET_WASLA)),
    };
    const readiness = checks.releaseIdentified && checks.durableStorage && checks.emailDelivery
      ? 'ready'
      : 'degraded';

    return Response.json(
      {
        status: 'ok',
        readiness,
        release,
        storage,
        checks,
        capabilities: {
          aiCore: checks.aiCore,
          imageEnhancement: process.env.AI_IMAGE_ENHANCEMENT_ENABLED === 'true' && checks.imageEnhancement,
          stripe: process.env.STRIPE_PAYMENTS_ENABLED === 'true'
            && configured(process.env.STRIPE_SECRET_KEY)
            && configured(process.env.STRIPE_WEBHOOK_SECRET),
          whatsappWebhook: configured(process.env.WHATSAPP_APP_SECRET)
            && configured(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unhealthy' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
