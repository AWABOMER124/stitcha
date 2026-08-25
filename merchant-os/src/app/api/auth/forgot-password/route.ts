import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import { enqueueExternalNotification } from '@/services/jobs/notification.jobs';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  if (!checkRateLimit(`forgot-password:${getClientIp(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { message: 'If an account exists for this email, a reset link has been sent.' },
      { status: 200 }
    );
  }

  const body = await req.json();
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always return the same generic response, whether or not the email exists —
  // this avoids leaking which emails have an account (user enumeration).
  const genericResponse = NextResponse.json({
    message: 'If an account exists for this email, a reset link has been sent.',
  });

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (!user || !user.passwordHash) return genericResponse;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?token=${rawToken}`;

  try {
    await enqueueExternalNotification({
      type: 'SYSTEM',
      channel: 'EMAIL',
      recipient: user.email,
      title: 'Reset your Waslak password',
      body: `We received a request to reset your password. This link expires in 1 hour: ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    }, `password-reset:${tokenHash}`);
  } catch (err) {
    console.error('[forgot-password] Failed to send reset email:', err);
  }

  return genericResponse;
}
