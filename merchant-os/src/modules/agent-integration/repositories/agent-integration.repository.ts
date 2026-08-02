import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

export function createStoreDraft(data: Prisma.StoreDraftUncheckedCreateInput) {
  return prisma.storeDraft.create({ data });
}

export function findDraftById(id: string, distributorId: string) {
  return prisma.storeDraft.findFirst({ where: { id, distributorId } });
}

export function listDraftsForDistributor(distributorId: string, take = 50) {
  return prisma.storeDraft.findMany({
    where: { distributorId },
    include: { apiKey: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export function markDraftApproved(id: string, merchantId: string, reviewedById: string) {
  return prisma.storeDraft.update({
    where: { id },
    data: { status: 'APPROVED', merchantId, reviewedById, reviewedAt: new Date() },
  });
}

export function markDraftRejected(id: string, reviewedById: string, reason?: string) {
  return prisma.storeDraft.update({
    where: { id },
    data: { status: 'REJECTED', reviewedById, reviewedAt: new Date(), rejectionReason: reason ?? null },
  });
}

export function listMerchantsForDistributor(distributorId: string) {
  return prisma.merchant.findMany({
    where: { distributorId },
    select: { id: true, name: true, slug: true, status: true, businessType: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function findMerchantForDistributor(merchantId: string, distributorId: string) {
  return prisma.merchant.findFirst({ where: { id: merchantId, distributorId } });
}

export function getOrderStatusCounts(merchantId: string) {
  return prisma.order.groupBy({
    by: ['status'],
    where: { merchantId },
    _count: { _all: true },
  });
}

export function createApiKey(data: Prisma.ApiKeyUncheckedCreateInput) {
  return prisma.apiKey.create({ data });
}

export function listApiKeysForDistributor(distributorId: string) {
  return prisma.apiKey.findMany({
    where: { distributorId },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      lastUsedAt: true, revokedAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function revokeApiKey(id: string, distributorId: string) {
  return prisma.apiKey.updateMany({
    where: { id, distributorId },
    data: { revokedAt: new Date() },
  });
}
