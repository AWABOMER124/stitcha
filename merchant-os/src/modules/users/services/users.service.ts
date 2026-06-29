import prisma from '@/lib/db/prisma';
import { NotFoundError, ConflictError } from '@/lib/errors';
import * as usersRepo from '../repositories/users.repository';
import type { CreateUserInput } from '../schemas/users.schemas';
import type { UserRole } from '@prisma/client';
import { nanoid } from 'nanoid';

// ============================================================================
// Users Service — Business logic
// ============================================================================

/** Get all users linked to a merchant */
export async function getUsers(merchantId: string) {
  return usersRepo.findByMerchant(merchantId);
}

/** Get a single user by ID */
export async function getUser(id: string) {
  const user = await usersRepo.findById(id);
  if (!user) throw new NotFoundError('User', id);
  return user;
}

/** Create a new user */
export async function createUser(data: CreateUserInput) {
  const existing = await usersRepo.findByEmail(data.email);
  if (existing) {
    throw new ConflictError(`A user with email "${data.email}" already exists`);
  }
  return usersRepo.create(data);
}

/**
 * Invite a user to a merchant.
 * If the user already exists by email, link them.
 * If not, create with a temporary password and link.
 */
export async function inviteUser(merchantId: string, email: string, role: string) {
  let user = await usersRepo.findByEmail(email);

  if (!user) {
    const tempPassword = nanoid(16);
    user = await usersRepo.create({
      name: email.split('@')[0],
      email,
      password: tempPassword,
      role: role as UserRole,
    }) as Awaited<ReturnType<typeof usersRepo.findByEmail>>;
  }

  return usersRepo.linkToMerchant(user!.id, merchantId, role as UserRole);
}

/** Update a user's role within a merchant */
export async function updateUserRole(merchantId: string, userId: string, newRole: string) {
  const merchantUser = await prisma.merchantUser.findUnique({
    where: { userId_merchantId: { userId, merchantId } },
  });

  if (!merchantUser) {
    throw new NotFoundError('MerchantUser');
  }

  return prisma.merchantUser.update({
    where: { id: merchantUser.id },
    data: { role: newRole as UserRole },
    include: { user: true },
  });
}

/** Deactivate a user within a merchant */
export async function deactivateUser(merchantId: string, userId: string) {
  const merchantUser = await prisma.merchantUser.findUnique({
    where: { userId_merchantId: { userId, merchantId } },
  });

  if (!merchantUser) {
    throw new NotFoundError('MerchantUser');
  }

  return prisma.merchantUser.update({
    where: { id: merchantUser.id },
    data: { isActive: false },
    include: { user: true },
  });
}
