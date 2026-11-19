export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ release: process.env.APP_RELEASE ?? 'unknown' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
