import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';

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
  const { name, email, phone, storeType, businessType, ownerName, ownerEmail, ownerPassword } = body;

  if (!name || !ownerName || !ownerEmail || !ownerPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (ownerPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50) + '-' + Date.now().toString(36);

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const merchant = await prisma.$transaction(async (tx) => {
    const newMerchant = await tx.merchant.create({
      data: {
        name,
        slug,
        email: email || null,
        phone: phone || null,
        businessType,
        storeType,
        status: 'ACTIVE',
        distributorId,
      },
    });

    const user = await tx.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'MERCHANT_OWNER',
      },
    });

    await tx.merchantUser.create({
      data: {
        userId: user.id,
        merchantId: newMerchant.id,
        role: 'MERCHANT_OWNER',
        isOwner: true,
      },
    });

    return newMerchant;
  });

  return NextResponse.json({ id: merchant.id, slug: merchant.slug }, { status: 201 });
}
