import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { ForbiddenError, UnauthorizedError, handleError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { hasPlatformPermission, isPlatformRole, PLATFORM_PERMISSIONS } from '@/lib/platform-permissions';
import * as platform from '@/modules/platform-notifications/services/platform-notifications.service';
import { mergedMerchantNotifications, mergedMerchantUnreadCount, markMergedMerchantRead } from '@/modules/communications/merchant-inbox';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };
const readSchema = z.object({ ids: z.array(z.string().min(1).max(180)).min(1).max(100) }).strict();

async function scope() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new UnauthorizedError('You must be logged in');
  if (isPlatformRole(user.role)) {
    if (!hasPlatformPermission(user.role, PLATFORM_PERMISSIONS.NOTIFICATIONS_READ)) throw new ForbiddenError('Notifications access required');
    return { kind: 'platform' as const, userId: user.id, merchantId: null };
  }
  if (!user.merchantId) throw new ForbiddenError('Merchant notifications access required');
  requirePermission({ userId: user.id, merchantId: user.merchantId, role: user.role, permissions: user.permissions ?? [] }, 'notifications:read');
  return { kind: 'merchant' as const, userId: user.id, merchantId: user.merchantId };
}

async function summary(context: Awaited<ReturnType<typeof scope>>) {
  const [unreadCount, latest] = context.kind === 'platform'
    ? await Promise.all([platform.getUnreadCount(), platform.getNotifications({ limit: 5 })])
    : await Promise.all([mergedMerchantUnreadCount(context.merchantId!, context.userId), mergedMerchantNotifications(context.merchantId!, context.userId, { limit: 5 })]);
  return NextResponse.json({ unreadCount, notifications: latest.data }, { headers: privateHeaders });
}

function failure(error: unknown) {
  const handled = handleError(error);
  return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode, headers: privateHeaders });
}

export async function GET() {
  try { return await summary(await scope()); } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host') ?? new URL(request.url).host;
    if (origin && new URL(origin).host !== host) throw new ForbiddenError('Same-origin request required');
    const context = await scope();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid notification selection' }, { status: 400, headers: privateHeaders }); }
    const parsed = readSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid notification selection' }, { status: 400, headers: privateHeaders });
    const { ids } = parsed.data;
    if (context.kind === 'platform') await platform.markAsRead(ids);
    else await markMergedMerchantRead(context.merchantId!, context.userId, ids);
    return await summary(context);
  } catch (error) { return failure(error); }
}
