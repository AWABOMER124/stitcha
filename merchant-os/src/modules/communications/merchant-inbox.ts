import { z } from 'zod';
import type { NotificationLog, Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';

const options = z.object({ isRead: z.boolean().optional(), type: z.enum(['SYSTEM', 'NEW_ORDER', 'ORDER_STATUS', 'LOW_STOCK']).optional(), id: z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/).optional(), page: z.number().int().min(1).max(100).default(1), limit: z.number().int().min(1).max(100).default(20) });
export async function mergedMerchantNotifications(merchantId: string, userId: string, input: unknown) {
  const f = options.parse(input || {}), skip = (f.page - 1) * f.limit, take = skip + f.limit;
  const legacyWhere: Prisma.NotificationLogWhereInput = { merchantId, channel: 'IN_APP', ...(f.id ? {id:f.id} : {}), ...(f.isRead === undefined ? {} : { isRead: f.isRead }), ...(f.type ? { type: f.type } : {}) };
  const personalWhere: Prisma.CommunicationDeliveryWhereInput = { userId, entityId: merchantId, channel: 'IN_APP', status: 'DELIVERED', ...(f.id ? {id:f.id.startsWith('message_')?f.id.slice(8):'__no_message__'} : {}),
    ...(f.isRead === undefined ? {} : { readAt: f.isRead ? { not: null } : null }) };
  const includePersonal = !f.type || f.type === 'SYSTEM';
  const [old, oldCount, personal, personalCount] = await Promise.all([
    prisma.notificationLog.findMany({ where: legacyWhere, take, orderBy: { createdAt: 'desc' } }), prisma.notificationLog.count({ where: legacyWhere }),
    includePersonal ? prisma.communicationDelivery.findMany({ where: personalWhere, take, orderBy: { createdAt: 'desc' } }) : [],
    includePersonal ? prisma.communicationDelivery.count({ where: personalWhere }) : 0,
  ]);
  const mapped: NotificationLog[] = personal.map(d => ({ id: `message_${d.id}`, merchantId, type: 'SYSTEM', channel: 'IN_APP', recipient: userId,
    title: d.title, body: d.body, isRead: Boolean(d.readAt), metadata: { kind: 'COMMUNICATION', actionPath: d.actionPath, deliveryId:d.id }, idempotencyKey: null, createdAt: d.createdAt }));
  return { data: [...old, ...mapped].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(skip, skip + f.limit),
    pagination: { page: f.page, limit: f.limit, total: oldCount + personalCount, totalPages: Math.ceil((oldCount + personalCount) / f.limit) } };
}
export async function mergedMerchantUnreadCount(merchantId: string, userId: string) {
  const counts = await Promise.all([prisma.notificationLog.count({ where: { merchantId, channel: 'IN_APP', isRead: false } }), prisma.communicationDelivery.count({ where: { userId, entityId: merchantId, channel: 'IN_APP', status: 'DELIVERED', readAt: null } })]);
  return counts[0] + counts[1];
}
export async function markMergedMerchantRead(merchantId: string, userId: string, ids: string[]) {
  const personalIds = ids.filter(id => id.startsWith('message_')).map(id => id.slice(8));
  const legacyIds = ids.filter(id => !id.startsWith('message_'));
  const results = await Promise.all([
    prisma.notificationLog.updateMany({ where: { merchantId, channel: 'IN_APP', id: { in: legacyIds } }, data: { isRead: true } }),
    prisma.communicationDelivery.updateMany({ where: { userId, entityId: merchantId, id: { in: personalIds }, channel: 'IN_APP', status: 'DELIVERED' }, data: { readAt: new Date() } }),
  ]);
  return { count: results[0].count + results[1].count };
}
