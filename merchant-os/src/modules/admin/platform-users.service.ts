import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import type { UserRole } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/lib/errors';
import { enqueueExternalNotification } from '@/services/jobs/notification.jobs';

export const PLATFORM_STAFF_ROLES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_OPERATIONS', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT'] as const;
export type PlatformStaffRole = typeof PLATFORM_STAFF_ROLES[number];

export async function invitePlatformUser(input: { email: string; name: string; role: PlatformStaffRole }) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existing?.role.startsWith('PLATFORM_')) throw new ConflictError('This user already belongs to the platform team');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const passwordHash = existing?.passwordHash ?? await bcrypt.hash(nanoid(32), 12);
  const user = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { role: input.role as UserRole, platformAccessEnabled: true } })
      : await tx.user.create({ data: { email, name: input.name.trim(), role: input.role as UserRole, passwordHash, platformAccessEnabled: true } });
    await tx.passwordResetToken.deleteMany({ where: { userId: saved.id } });
    await tx.passwordResetToken.create({ data: { userId: saved.id, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return saved;
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?token=${rawToken}`;
  try {
    await enqueueExternalNotification({ type: 'SYSTEM', channel: 'EMAIL', recipient: email, title: 'دعوة فريق وصلة', body: `تمت دعوتك إلى فريق وصلة بدور ${input.role}. أنشئ كلمة المرور خلال 24 ساعة: ${resetUrl}` }, `platform-invite:${tokenHash}`);
  } catch (error) {
    console.error('[platform-users] Failed to enqueue invite:', error);
  }
  return user;
}

export async function updatePlatformUserRole(actorId: string, userId: string, role: PlatformStaffRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.role.startsWith('PLATFORM_')) throw new NotFoundError('Platform user');
  if (actorId === userId && role !== 'PLATFORM_OWNER') throw new BusinessRuleError('You cannot remove your own platform owner access');
  if (user.role === 'PLATFORM_OWNER' && role !== 'PLATFORM_OWNER') {
    const owners = await prisma.user.count({ where: { role: 'PLATFORM_OWNER' } });
    if (owners <= 1) throw new BusinessRuleError('The platform must keep at least one owner');
  }
  return prisma.user.update({ where: { id: userId }, data: { role: role as UserRole } });
}

export async function setPlatformUserAccess(actorId: string, userId: string, enabled: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.role.startsWith('PLATFORM_')) throw new NotFoundError('Platform user');
  if (actorId === userId && !enabled) throw new BusinessRuleError('You cannot disable your own platform access');
  if (user.role === 'PLATFORM_OWNER' && !enabled) {
    const activeOwners = await prisma.user.count({ where: { role: 'PLATFORM_OWNER', platformAccessEnabled: true } });
    if (activeOwners <= 1) throw new BusinessRuleError('The platform must keep at least one active owner');
  }
  return prisma.user.update({ where: { id: userId }, data: { platformAccessEnabled: enabled } });
}
