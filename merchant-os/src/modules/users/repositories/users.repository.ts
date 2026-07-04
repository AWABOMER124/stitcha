import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from '../schemas/users.schemas';

// ============================================================================
// Users Repository — Data access layer
// ============================================================================

const SALT_ROUNDS = 12;

/** Find a user by ID with merchant links */
export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      merchantUsers: {
        include: { merchant: true },
      },
    },
  });
}

/** Find a user by email */
export async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      merchantUsers: {
        include: { merchant: true },
      },
    },
  });
}

/** Find all users linked to a merchant */
export async function findByMerchant(merchantId: string) {
  return prisma.merchantUser.findMany({
    where: { merchantId },
    include: {
      user: true,
      branch: true,
      assignedRole: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Find all staff users linked to a distributor */
export async function findByDistributor(distributorId: string) {
  return prisma.distributorUser.findMany({
    where: { distributorId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Link a user to a distributor (upsert to handle re-invites) */
export async function linkToDistributor(
  userId: string,
  distributorId: string,
  role: UserRole,
  isOwner = false,
) {
  return prisma.distributorUser.upsert({
    where: { userId_distributorId: { userId, distributorId } },
    create: { userId, distributorId, role, isOwner, isActive: true },
    update: { role, isActive: true },
    include: { user: true },
  });
}

/** Create a new user with hashed password */
export async function create(data: CreateUserInput) {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role as UserRole,
      passwordHash,
    },
  });
}

/** Update a user, optionally re-hashing password */
export async function update(id: string, data: UpdateUserInput) {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
}

/** Link a user to a merchant (upsert to handle re-invites) */
export async function linkToMerchant(
  userId: string,
  merchantId: string,
  role: UserRole,
  isOwner = false
) {
  return prisma.merchantUser.upsert({
    where: {
      userId_merchantId: { userId, merchantId },
    },
    create: {
      userId,
      merchantId,
      role,
      isOwner,
      isActive: true,
    },
    update: {
      role,
      isActive: true,
    },
    include: {
      user: true,
      merchant: true,
    },
  });
}
