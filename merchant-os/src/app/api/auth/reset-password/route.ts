import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  if (!checkRateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts, try again later' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { token, password } = body ?? {};

  if (!token || typeof token !== 'string' || token.length > 200) {
    return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return NextResponse.json({ error: 'Password must be at least 8 characters and at most 72 UTF-8 bytes' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const changed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${resetToken.userId} FOR UPDATE`;
    const used = await tx.passwordResetToken.updateMany({ where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (used.count !== 1) return false;
    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash, authVersion: { increment: 1 } } });
    await tx.passwordResetToken.updateMany({ where: { userId: resetToken.userId, usedAt: null }, data: { usedAt: new Date() } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });

  return NextResponse.json({ message: 'Password updated successfully' });
}
