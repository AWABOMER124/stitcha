import prisma from '@/lib/db/prisma';
import type { DistributorNotificationType, Prisma } from '@prisma/client';
import type { CreateDistributorNotificationInput } from '../schemas/distributor-notifications.schemas';

// ============================================================================
// Distributor Notifications Repository — Data access layer
// ============================================================================

/** Find all notifications with optional filters and pagination */
export async function findAll(
  distributorId: string,
  filters?: { isRead?: boolean; type?: string; page?: number; limit?: number }
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.DistributorNotificationLogWhereInput = {
    distributorId,
    ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
    ...(filters?.type && { type: filters.type as DistributorNotificationType }),
  };

  const [data, total] = await Promise.all([
    prisma.distributorNotificationLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.distributorNotificationLog.count({ where }),
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
export async function create(distributorId: string, data: CreateDistributorNotificationInput) {
  return prisma.distributorNotificationLog.create({
    data: {
      distributorId,
      type: data.type as DistributorNotificationType,
      title: data.title,
      body: data.body,
    },
  });
}

/** Mark notifications as read */
export async function markAsRead(distributorId: string, ids: string[]) {
  return prisma.distributorNotificationLog.updateMany({
    where: {
      id: { in: ids },
      distributorId,
    },
    data: { isRead: true },
  });
}

/** Count unread notifications */
export async function countUnread(distributorId: string) {
  return prisma.distributorNotificationLog.count({
    where: { distributorId, isRead: false },
  });
}
