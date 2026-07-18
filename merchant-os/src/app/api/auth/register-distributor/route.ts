import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';
import * as platformNotificationsService from '@/modules/platform-notifications/services/platform-notifications.service';

export async function POST(req: Request) {
  const body = await req.json();
  const { distributorName, ownerName, phone, password } = body;

  if (!distributorName || !ownerName || !phone || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const normalizedPhone = String(phone).trim();

  const existing = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
  if (existing) {
    return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 });
  }

  const baseSlug = distributorName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // User.email is still required by the schema — phone-based signups get an
  // internal placeholder that's never shown or emailed to anyone.
  const placeholderEmail = `phone-${normalizedPhone.replace(/[^0-9]/g, '')}-${crypto.randomBytes(4).toString('hex')}@waslak.internal`;
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const distributor = await tx.distributor.create({
      data: { name: distributorName, slug, phone: normalizedPhone, status: 'PENDING' },
    });

    const user = await tx.user.create({
      data: {
        name: ownerName,
        email: placeholderEmail,
        phone: normalizedPhone,
        passwordHash,
        role: 'DISTRIBUTOR_OWNER',
      },
    });

    await tx.distributorUser.create({
      data: { userId: user.id, distributorId: distributor.id, role: 'DISTRIBUTOR_OWNER', isOwner: true },
    });

    return { distributorId: distributor.id, userId: user.id };
  });

  await platformNotificationsService
    .sendNotification({
      type: 'NEW_DISTRIBUTOR',
      title: 'موزع جديد بانتظار الموافقة',
      body: `سجّل "${distributorName}" حساباً جديداً كموزع ويحتاج مراجعتك للتفعيل.`,
    })
    .catch((err) => console.error('[register-distributor] Failed to notify platform admins:', err));

  return NextResponse.json(result, { status: 201 });
}
