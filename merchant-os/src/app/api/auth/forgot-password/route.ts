import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import { EmailProvider } from '@/services/notifications/providers/email.provider';

// Password reset emails aren't merchant-scoped (any role can request one), so
// this sends directly through the EmailProvider rather than the merchant-
// scoped NotificationService (which requires a merchantId for its audit log).
const emailProvider = new EmailProvider();

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
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

  const user = await prisma.user.findUnique({ where: { email } });
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
    await emailProvider.send({
      type: 'SYSTEM',
      channel: 'EMAIL',
      recipient: user.email,
      title: 'Reset your Waslak password',
      body: `We received a request to reset your password. This link expires in 1 hour: ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    });
  } catch (err) {
    console.error('[forgot-password] Failed to send reset email:', err);
  }

  return genericResponse;
}
