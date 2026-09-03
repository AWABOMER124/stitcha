import prisma from '@/lib/db/prisma';
import crypto from 'crypto';
import { NotFoundError, ConflictError, BusinessRuleError } from '@/lib/errors';
import * as usersRepo from '../repositories/users.repository';
import type { CreateUserInput } from '../schemas/users.schemas';
import type { UserRole } from '@prisma/client';
import { nanoid } from 'nanoid';
import { enqueueExternalNotification } from '@/services/jobs/notification.jobs';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';

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
 * Creates a one-hour password reset token for a newly-invited user and
 * emails the set-password link — otherwise an invited user has a random
 * unguessable password with no way to ever log in.
 */
async function sendSetPasswordInvite(userId: string, email: string, name: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?token=${rawToken}`;

  try {
    await enqueueExternalNotification({
      type: 'SYSTEM',
      channel: 'EMAIL',
      recipient: email,
      title: 'You have been invited to WASLA',
      body: `Hi ${name}, you've been invited to join WASLA. Set your password here (expires in 1 hour): ${resetUrl}`,
    }, `user-invite:${tokenHash}`);
  } catch (err) {
    console.error('[users] Failed to send invite email:', err);
  }
}

/**
 * Invite a user to a merchant.
 * If the user already exists by email, link them.
 * If not, create with a random password and email a set-password link.
 */
export async function inviteUser(merchantId: string, email: string, role: string) {
  let user = await usersRepo.findByEmail(email);
  let isNewUser = false;

  if (!user) {
    const tempPassword = nanoid(24);
    user = await usersRepo.create({
      name: email.split('@')[0],
      email,
      password: tempPassword,
      role: role as CreateUserInput['role'],
    }) as Awaited<ReturnType<typeof usersRepo.findByEmail>>;
    isNewUser = true;
  }

  const membership = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'staff-users:' + merchantId}))`;
    const existing = await tx.merchantUser.findUnique({
      where: { userId_merchantId: { userId: user!.id, merchantId } },
      select: { isActive: true },
    });
    if (!existing?.isActive) {
      const [plan, current] = await Promise.all([
        getMerchantPlanSnapshot(merchantId, new Date(), tx),
        tx.merchantUser.count({ where: { merchantId, isActive: true } }),
      ]);
      if (plan.entitlements.maxStaffUsers !== -1 && current >= plan.entitlements.maxStaffUsers) {
        throw new BusinessRuleError(`باقتك تسمح بعدد ${plan.entitlements.maxStaffUsers} من حسابات الفريق. رقِّ إلى Pro لإضافة مستخدمين آخرين.`);
      }
    }
    return tx.merchantUser.upsert({
      where: { userId_merchantId: { userId: user!.id, merchantId } },
      create: { userId: user!.id, merchantId, role: role as UserRole, isActive: true },
      update: { role: role as UserRole, isActive: true },
      include: { user: true, merchant: true },
    });
  });

  if (isNewUser) await sendSetPasswordInvite(user!.id, user!.email, user!.name ?? email);
  return membership;
}

/** Get all staff users for a distributor */
export async function getDistributorUsers(distributorId: string) {
  return usersRepo.findByDistributor(distributorId);
}

/**
 * Invite a user to a distributor's staff.
 * If the user already exists by email, link them.
 * If not, create with a random password and email a set-password link.
 */
export async function inviteDistributorUser(distributorId: string, email: string, role: string, isOwner = false) {
  let user = await usersRepo.findByEmail(email);
  let isNewUser = false;

  if (!user) {
    const tempPassword = nanoid(24);
    user = await usersRepo.create({
      name: email.split('@')[0],
      email,
      password: tempPassword,
      role: role as CreateUserInput['role'],
    }) as Awaited<ReturnType<typeof usersRepo.findByEmail>>;
    isNewUser = true;
  }

  if (isNewUser) {
    await sendSetPasswordInvite(user!.id, user!.email, user!.name ?? email);
  }

  return usersRepo.linkToDistributor(user!.id, distributorId, role as UserRole, isOwner);
}

/** Update a distributor staff member's role */
export async function updateDistributorUserRole(distributorId: string, userId: string, newRole: string) {
  const distributorUser = await prisma.distributorUser.findUnique({
    where: { userId_distributorId: { userId, distributorId } },
  });
  if (!distributorUser) throw new NotFoundError('DistributorUser');

  return prisma.distributorUser.update({
    where: { id: distributorUser.id },
    data: { role: newRole as UserRole },
    include: { user: true },
  });
}

/** Toggle whether a distributor staff member is flagged as an owner */
export async function setDistributorUserOwner(distributorId: string, userId: string, isOwner: boolean) {
  const distributorUser = await prisma.distributorUser.findUnique({
    where: { userId_distributorId: { userId, distributorId } },
  });
  if (!distributorUser) throw new NotFoundError('DistributorUser');

  return prisma.distributorUser.update({
    where: { id: distributorUser.id },
    data: { isOwner },
    include: { user: true },
  });
}

/** Activate or deactivate a distributor staff member */
export async function setDistributorUserActive(distributorId: string, userId: string, isActive: boolean) {
  const distributorUser = await prisma.distributorUser.findUnique({
    where: { userId_distributorId: { userId, distributorId } },
  });
  if (!distributorUser) throw new NotFoundError('DistributorUser');

  return prisma.distributorUser.update({
    where: { id: distributorUser.id },
    data: { isActive },
    include: { user: true },
  });
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
