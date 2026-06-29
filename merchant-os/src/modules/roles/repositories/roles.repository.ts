import prisma from '@/lib/db/prisma';
import type { CreateRoleInput, UpdateRoleInput } from '../schemas/roles.schemas';

// ============================================================================
// Roles Repository — Data access layer
// ============================================================================

/** Find all roles: system-wide + merchant-scoped */
export async function findAll(merchantId: string) {
  return prisma.role.findMany({
    where: {
      OR: [{ merchantId: null }, { merchantId }],
    },
    include: {
      _count: { select: { permissions: true, merchantUsers: true } },
    },
    orderBy: { name: 'asc' },
  });
}

/** Find a role by ID with permissions */
export async function findById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });
}

/** Create a merchant-scoped role */
export async function create(merchantId: string, data: CreateRoleInput) {
  return prisma.role.create({
    data: {
      merchantId,
      name: data.name,
      description: data.description,
      isSystem: false,
    },
    include: {
      _count: { select: { permissions: true, merchantUsers: true } },
    },
  });
}

/** Update a role */
export async function update(id: string, data: UpdateRoleInput) {
  return prisma.role.update({
    where: { id },
    data,
    include: {
      _count: { select: { permissions: true, merchantUsers: true } },
    },
  });
}

/** Delete a role */
export async function remove(id: string) {
  return prisma.role.delete({
    where: { id },
  });
}

/** Replace all permissions for a role */
export async function assignPermissions(roleId: string, permissionIds: string[]) {
  return prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return tx.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  });
}

/** Get permissions for a role */
export async function getPermissions(roleId: string) {
  return prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
}
