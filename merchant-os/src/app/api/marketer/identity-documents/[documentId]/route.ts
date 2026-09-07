import { auth } from '@/lib/auth/config';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '@/lib/platform-permissions';
import { downloadMarketerIdentityDocument } from '@/modules/marketer-portal/marketer-profile.service';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !hasPlatformPermission(session.user.role, PLATFORM_PERMISSIONS.MERCHANTS_MANAGE)) return new Response('Forbidden', { status: 403 });
  try { const file = await downloadMarketerIdentityDocument((await params).documentId); return new Response(Buffer.from(file.body), { headers: { 'Content-Type': file.mimeType, 'Content-Length': String(file.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox" } }); } catch { return new Response('Not found', { status: 404 }); }
}
