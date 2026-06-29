import prisma from '@/lib/db/prisma';
import type { NotificationType, Prisma } from '@prisma/client';
import type { CreateNotificationInput } from '../schemas/notifications.schemas';

// ============================================================================
// Notifications Repository — Data access layer
// ============================================================================

/** Find all notifications with optional filters and pagination */
export async function findAll(
  merchantId: string,
  filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationLogWhereInput = {
    merchantId,
    ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
    ...(filters?.type && { type: filters.type as NotificationType }),
  };

  const [data, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Create a notification log entry */
export async function create(merchantId: string, data: CreateNotificationInput) {
  return prisma.notificationLog.create({
    data: {
      merchantId,
      type: data.type as NotificationType,
      channel: data.channel,
      recipient: data.recipient,
      title: data.title,
      body: data.body,
    },
  });
}

/** Mark notifications as read */
export async function markAsRead(merchantId: string, ids: string[]) {
  return prisma.notificationLog.updateMany({
    where: {
      id: { in: ids },
      merchantId,
    },
    data: { isRead: true },
  });
}

/** Count unread notifications */
export async function countUnread(merchantId: string) {
  return prisma.notificationLog.count({
    where: { merchantId, isRead: false },
  });
}
