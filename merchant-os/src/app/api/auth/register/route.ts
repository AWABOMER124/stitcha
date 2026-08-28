import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { z } from 'zod';
import crypto from 'crypto';
import { formatPhoneNumber } from '@/lib/utils/formatting';
import { sendOtp } from '@/modules/phone-verification/services/phone-verification.service';

const directMerchantRegistrationSchema = z.object({
  merchantName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(9).max(24),
  password: z.string().min(8).max(128),
  businessType: z.enum(['RESTAURANT', 'CAFE', 'GROCERY', 'PHARMACY', 'RETAIL', 'OTHER']).default('RETAIL'),
});

export async function POST(req: Request) {
  if (!checkRateLimit(`register:${getClientIp(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts, try again later' }, { status: 429 });
  }

  const parsed = directMerchantRegistrationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid registration details' }, { status: 400 });
  const { merchantName, ownerName, email, password, businessType } = parsed.data;

  const normalizedEmail = String(email).trim().toLowerCase();
  const phone = formatPhoneNumber(parsed.data.phone);
  if (!/^\+249\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'أدخل رقم واتساب سوداني صحيحاً' }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
        { phone: { in: [phone, parsed.data.phone.trim()] } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'البريد الإلكتروني أو رقم الهاتف مستخدم مسبقاً' }, { status: 409 });
  }

  const baseSlug = merchantName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = `${baseSlug || 'store'}-${Date.now().toString(36)}`;

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationEnabled = process.env.WHATSAPP_SIGNUP_VERIFICATION_ENABLED === 'true';
  const registrationToken = verificationEnabled ? crypto.randomBytes(32).toString('base64url') : null;
  const registrationTokenExpiresAt = verificationEnabled ? new Date(Date.now() + 30 * 60 * 1000) : null;

  const registration = await prisma.$transaction(async (tx) => {
    const newMerchant = await tx.merchant.create({
      data: {
        name: merchantName,
        slug,
        email: normalizedEmail,
        phone,
        businessType,
        status: verificationEnabled ? 'PENDING' : 'ACTIVE',
        registrationToken,
        registrationTokenExpiresAt,
        subscription: {
          create: { plan: { connect: { code: 'FREE' } } },
        },
      },
    });

    const user = await tx.user.create({
      data: {
        name: ownerName,
        email: normalizedEmail,
        phone,
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

    return { merchant: newMerchant, user };
  });

  if (!verificationEnabled) {
    return NextResponse.json({ slug: registration.merchant.slug, verificationRequired: false }, { status: 201 });
  }

  let otpSent = true;
  let warning: string | undefined;
  try {
    await sendOtp(registration.user.id);
  } catch (error) {
    otpSent = false;
    warning = error instanceof Error ? error.message : 'تعذر إرسال رمز واتساب';
  }

  return NextResponse.json({
    slug: registration.merchant.slug,
    verificationRequired: true,
    verificationToken: registrationToken,
    phone,
    expiresInMinutes: 10,
    otpSent,
    ...(warning && { warning }),
  }, { status: 201 });
}
