import prisma from '@/lib/db/prisma';

export async function create(userId: string, phone: string, codeHash: string, expiresAt: Date) {
  return prisma.phoneVerification.create({
    data: { userId, phone, codeHash, expiresAt },
  });
}

/** Latest, not-yet-verified OTP for a user (used to check the code they submit). */
export async function findLatestPending(userId: string) {
  return prisma.phoneVerification.findFirst({
    where: { userId, verifiedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function incrementAttempts(id: string) {
  return prisma.phoneVerification.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}

export async function markVerified(id: string) {
  return prisma.phoneVerification.update({
    where: { id },
    data: { verifiedAt: new Date() },
  });
}

export async function markUserPhoneVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { phoneVerifiedAt: new Date() },
  });
}

export async function getUserForOtp(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, name: true, phoneVerifiedAt: true },
  });
}
