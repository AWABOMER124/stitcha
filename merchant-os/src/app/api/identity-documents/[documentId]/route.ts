import { auth } from '@/lib/auth/config';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '@/lib/platform-permissions';
import { downloadIdentityDocument } from '@/modules/identity-verification/identity-verification.service';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const platformAllowed = hasPlatformPermission(session.user.role, PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const merchantAllowed = !!session.user.merchantId
    && (session.user.role === 'MERCHANT_OWNER' || session.user.permissions?.includes('settings:update'));
  if (!platformAllowed && !merchantAllowed) return new Response('Forbidden', { status: 403 });
  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== 'MERCHANT' && kind !== 'AFFILIATE') return new Response('Not found', { status: 404 });
  try {
    const { documentId } = await params;
    const file = await downloadIdentityDocument(kind, documentId, { isPlatform: platformAllowed, merchantId: session.user.merchantId });
    return new Response(Buffer.from(file.body), { headers: { 'Content-Type': file.mimeType, 'Content-Length': String(file.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
