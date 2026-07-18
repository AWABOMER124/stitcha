import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';

const REGISTRATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const whatsAppProvider = new WhatsAppProvider();

/** Regenerate and resend a merchant's registration invite link (e.g. after it expired or was lost). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const merchant = await prisma.merchant.findFirst({
    where: { id, distributorId: session.user.distributorId, status: 'PENDING' },
    select: { id: true, name: true, phone: true },
  });
  if (!merchant) return NextResponse.json({ error: 'Merchant not found or already active' }, { status: 404 });
  if (!merchant.phone) return NextResponse.json({ error: 'This merchant has no phone number on file' }, { status: 400 });

  const registrationToken = crypto.randomBytes(24).toString('hex');
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { registrationToken, registrationTokenExpiresAt: new Date(Date.now() + REGISTRATION_LINK_TTL_MS) },
  });

  const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/complete-registration/${registrationToken}`;

  try {
    await whatsAppProvider.send({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: merchant.phone,
      title: 'أكمل تسجيل متجرك في وصلك',
      body: `مرحبًا، هذا رابط جديد لإكمال تسجيل متجر "${merchant.name}" على منصة وصلك (صالح لمدة 7 أيام):\n${registrationUrl}`,
    });
  } catch (err) {
    console.error('[resend-invite] Failed to send registration link:', err);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
