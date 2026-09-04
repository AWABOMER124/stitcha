import prisma from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const storage = process.env.S3_BUCKET
      ? { provider: 's3', durabilityDeclared: true }
      : { provider: 'local', durabilityDeclared: process.env.PUBLIC_UPLOADS_PERSISTENT === 'true' };
    return Response.json(
      { status: 'ok', release: process.env.APP_RELEASE ?? 'unknown', storage },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unhealthy' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
