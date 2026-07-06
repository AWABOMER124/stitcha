import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';

const REGISTRATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const whatsAppProvider = new WhatsAppProvider();

/**
 * Distributor "Add Merchant" — invite-by-link flow. Only collects the
 * basics (store name, phone, location); the merchant completes the rest of
 * their own registration (owner name, password, business type) by following
 * a unique link sent to this phone number via WhatsApp.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const distributorId = session.user.distributorId;
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, address } = body;

  if (!name || !phone || !address) {
    return NextResponse.json({ error: 'Store name, phone, and location are required' }, { status: 400 });
  }

  const slug =
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36);

  const registrationToken = crypto.randomBytes(24).toString('hex');

  const merchant = await prisma.merchant.create({
    data: {
      name,
      slug,
      phone,
      address,
      businessType: 'OTHER',
      storeType: 'ONLINE_STORE',
      status: 'PENDING',
      distributorId,
      registrationToken,
      registrationTokenExpiresAt: new Date(Date.now() + REGISTRATION_LINK_TTL_MS),
    },
  });

  const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/complete-registration/${registrationToken}`;

  try {
    await whatsAppProvider.send({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: phone,
      title: 'أكمل تسجيل متجرك في وصلك',
      body: `مرحبًا، تمت إضافة متجر "${name}" على منصة وصلك. أكمل بياناتك من الرابط التالي (صالح لمدة 7 أيام):\n${registrationUrl}`,
    });
  } catch (err) {
    console.error('[distributor/merchants] Failed to send registration link:', err);
  }

  return NextResponse.json({ id: merchant.id, slug: merchant.slug }, { status: 201 });
}
