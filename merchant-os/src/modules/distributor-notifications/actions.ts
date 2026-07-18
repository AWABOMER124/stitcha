'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as distributorNotificationsService from './services/distributor-notifications.service';
import { markDistributorNotificationsReadSchema } from './schemas/distributor-notifications.schemas';
import type { ActionResult, PaginatedResult } from '@/lib/types';
import type { DistributorNotificationLog } from '@prisma/client';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

// ============================================================================
// Distributor Notifications Module — Server Actions
// ============================================================================

/** Get paginated notifications */
export async function getDistributorNotificationsAction(
  filters?: unknown
): Promise<ActionResult<PaginatedResult<DistributorNotificationLog>>> {
  try {
    const distributorId = await getDistributorId();
    const result = await distributorNotificationsService.getNotifications(
      distributorId,
      filters as { isRead?: boolean; type?: string; page?: number; limit?: number } | undefined
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get notifications' };
  }
}

/** Mark notifications as read */
export async function markDistributorNotificationsReadAction(
  formData: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = markDistributorNotificationsReadSchema.parse(formData);
    const result = await distributorNotificationsService.markAsRead(distributorId, parsed.ids);
    return { success: true, data: { count: result.count } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark notifications as read' };
  }
}

/** Get unread notification count */
export async function getDistributorUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    const distributorId = await getDistributorId();
    const count = await distributorNotificationsService.getUnreadCount(distributorId);
    return { success: true, data: count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get unread count' };
  }
}
