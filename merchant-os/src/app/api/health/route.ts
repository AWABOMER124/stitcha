import prisma from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { status: 'ok', release: process.env.APP_RELEASE ?? 'unknown' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unhealthy' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
