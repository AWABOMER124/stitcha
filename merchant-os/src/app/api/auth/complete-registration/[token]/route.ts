import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const merchant = await prisma.merchant.findFirst({
    where: { registrationToken: token },
    select: { id: true, name: true, phone: true, address: true, status: true, registrationTokenExpiresAt: true },
  });

  if (!merchant || merchant.status !== 'PENDING') {
    return NextResponse.json({ error: 'Invalid or already-used registration link' }, { status: 404 });
  }
  if (merchant.registrationTokenExpiresAt && merchant.registrationTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'This registration link has expired' }, { status: 410 });
  }

  return NextResponse.json({
    name: merchant.name,
    phone: merchant.phone,
    address: merchant.address,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();
  const { ownerName, password, businessType } = body;

  if (!ownerName || !password || !businessType) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const merchant = await prisma.merchant.findFirst({
    where: { registrationToken: token },
    select: { id: true, phone: true, status: true, registrationTokenExpiresAt: true },
  });
  if (!merchant || merchant.status !== 'PENDING') {
    return NextResponse.json({ error: 'Invalid or already-used registration link' }, { status: 404 });
  }
  if (merchant.registrationTokenExpiresAt && merchant.registrationTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'This registration link has expired' }, { status: 410 });
  }
  if (!merchant.phone) {
    return NextResponse.json({ error: 'This invite is missing a phone number' }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({ where: { phone: merchant.phone } });
  if (existingUser) {
    return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 });
  }

  const placeholderEmail = `phone-${merchant.phone.replace(/[^0-9]/g, '')}-${crypto.randomBytes(4).toString('hex')}@waslak.internal`;
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: ownerName,
        email: placeholderEmail,
        phone: merchant.phone,
        passwordHash,
        role: 'MERCHANT_OWNER',
      },
    });

    await tx.merchantUser.create({
      data: { userId: user.id, merchantId: merchant.id, role: 'MERCHANT_OWNER', isOwner: true },
    });

    await tx.merchant.update({
      where: { id: merchant.id },
      data: { businessType },
    });

    return { userId: user.id, merchantId: merchant.id };
  });

  return NextResponse.json(result, { status: 201 });
}
