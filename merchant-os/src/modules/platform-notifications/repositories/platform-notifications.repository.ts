import prisma from '@/lib/db/prisma';
import type { PlatformNotificationType, Prisma } from '@prisma/client';
import type { CreatePlatformNotificationInput } from '../schemas/platform-notifications.schemas';

// ============================================================================
// Platform Notifications Repository — Data access layer
// ============================================================================

/** Find all notifications with optional filters and pagination */
export async function findAll(filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.PlatformNotificationLogWhereInput = {
    ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
    ...(filters?.type && { type: filters.type as PlatformNotificationType }),
  };

  const [data, total] = await Promise.all([
    prisma.platformNotificationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.platformNotificationLog.count({ where }),
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
export async function create(data: CreatePlatformNotificationInput) {
  return prisma.platformNotificationLog.create({
    data: {
      type: data.type as PlatformNotificationType,
      title: data.title,
      body: data.body,
    },
  });
}

/** Mark notifications as read */
export async function markAsRead(ids: string[]) {
  return prisma.platformNotificationLog.updateMany({
    where: { id: { in: ids } },
    data: { isRead: true },
  });
}

/** Count unread notifications */
export async function countUnread() {
  return prisma.platformNotificationLog.count({
    where: { isRead: false },
  });
}
