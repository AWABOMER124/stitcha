import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const { merchantName, ownerName, email, phone, password, businessType } = body;

  if (!merchantName || !ownerName || !email || !phone || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const baseSlug = merchantName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = baseSlug + '-' + Date.now().toString(36);

  const passwordHash = await bcrypt.hash(password, 12);

  const merchant = await prisma.$transaction(async (tx) => {
    const newMerchant = await tx.merchant.create({
      data: {
        name: merchantName,
        slug,
        email,
        phone,
        businessType: businessType || 'RESTAURANT',
        status: 'ACTIVE',
      },
    });

    const user = await tx.user.create({
      data: {
        name: ownerName,
        email,
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

    await tx.branch.create({
      data: {
        merchantId: newMerchant.id,
        name: 'Main Branch',
        phone,
        isMain: true,
      },
    });

    await tx.storefrontSettings.create({
      data: { merchantId: newMerchant.id },
    });

    return newMerchant;
  });

  return NextResponse.json({ slug: merchant.slug }, { status: 201 });
}
