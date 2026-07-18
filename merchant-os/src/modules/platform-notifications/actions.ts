'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as platformNotificationsService from './services/platform-notifications.service';
import { markPlatformNotificationsReadSchema } from './schemas/platform-notifications.schemas';
import type { ActionResult, PaginatedResult } from '@/lib/types';
import type { PlatformNotificationLog } from '@prisma/client';

async function requirePlatformOwner(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'PLATFORM_OWNER') redirect('/dashboard');
}

// ============================================================================
// Platform Notifications Module — Server Actions
// ============================================================================

/** Get paginated notifications */
export async function getPlatformNotificationsAction(
  filters?: unknown
): Promise<ActionResult<PaginatedResult<PlatformNotificationLog>>> {
  try {
    await requirePlatformOwner();
    const result = await platformNotificationsService.getNotifications(
      filters as { isRead?: boolean; type?: string; page?: number; limit?: number } | undefined
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get notifications' };
  }
}

/** Mark notifications as read */
export async function markPlatformNotificationsReadAction(
  formData: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    await requirePlatformOwner();
    const parsed = markPlatformNotificationsReadSchema.parse(formData);
    const result = await platformNotificationsService.markAsRead(parsed.ids);
    return { success: true, data: { count: result.count } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark notifications as read' };
  }
}

/** Get unread notification count */
export async function getPlatformUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    await requirePlatformOwner();
    const count = await platformNotificationsService.getUnreadCount();
    return { success: true, data: count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get unread count' };
  }
}
