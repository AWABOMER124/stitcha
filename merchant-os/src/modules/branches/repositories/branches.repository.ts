import prisma from '@/lib/db/prisma';
import type { CreateBranchInput, UpdateBranchInput } from '../schemas/branches.schemas';

// ============================================================================
// Branches Repository — Data access layer
// ============================================================================

/** Find a branch by ID with staff count */
export async function findById(merchantId: string, id: string) {
  return prisma.branch.findFirst({
    where: { id, merchantId },
    include: {
      _count: { select: { merchantUsers: true } },
    },
  });
}

/** Find all branches for a merchant, main branch first */
export async function findAll(merchantId: string) {
  return prisma.branch.findMany({
    where: { merchantId },
    orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { merchantUsers: true } },
    },
  });
}

/** Create a new branch */
export async function create(merchantId: string, data: CreateBranchInput) {
  return prisma.branch.create({
    data: { merchantId, ...data },
    include: {
      _count: { select: { merchantUsers: true } },
    },
  });
}

/** Update a branch */
export async function update(merchantId: string, id: string, data: UpdateBranchInput) {
  return prisma.branch.update({
    where: { id, merchantId },
    data,
    include: {
      _count: { select: { merchantUsers: true } },
    },
  });
}

/** Delete a branch */
export async function remove(merchantId: string, id: string) {
  return prisma.branch.delete({
    where: { id, merchantId },
  });
}

/** Set a branch as the main branch, unsetting all others */
export async function setMain(merchantId: string, id: string) {
  return prisma.$transaction([
    prisma.branch.updateMany({
      where: { merchantId, isMain: true },
      data: { isMain: false },
    }),
    prisma.branch.update({
      where: { id, merchantId },
      data: { isMain: true },
      include: {
        _count: { select: { merchantUsers: true } },
      },
    }),
  ]);
}
