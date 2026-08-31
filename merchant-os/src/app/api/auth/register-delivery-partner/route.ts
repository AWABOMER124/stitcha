import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { formatPhoneNumber } from "@/lib/utils/formatting";
import { uniqueSlug } from "@/lib/slug";

const schema = z
  .object({
    companyName: z.string().trim().min(2).max(120),
    ownerName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(9).max(24).regex(/^\+?[\d\s()-]+$/).refine(value => {
      const normalized = formatPhoneNumber(value);
      return /^\+?[1-9]\d{8,14}$/.test(normalized);
    }),
    password: z.string().min(8).max(128),
  })
  .strict();

export async function POST(request: Request) {
  if (
    !checkRateLimit(
      `delivery-partner-register:${getClientIp(request)}`,
      5,
      60 * 60_000,
    )
  ) {
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقاً" },
      { status: 429 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "راجع بيانات التسجيل" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const phone = formatPhoneNumber(parsed.data.phone);
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });
  if (exists)
    return NextResponse.json(
      { error: "البريد الإلكتروني أو الهاتف مستخدم مسبقاً" },
      { status: 409 },
    );

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const partner = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryPartner.create({
      data: {
        name: parsed.data.companyName,
        slug:
          uniqueSlug(parsed.data.companyName) ||
          `partner-${Date.now().toString(36)}`,
        contactName: parsed.data.ownerName,
        email,
        phone,
        status: "PENDING",
        appName: parsed.data.companyName,
      },
    });
    const user = await tx.user.create({
      data: {
        name: parsed.data.ownerName,
        email,
        phone,
        passwordHash,
        role: "DELIVERY_PARTNER_OWNER",
      },
    });
    await tx.deliveryPartnerUser.create({
      data: {
        userId: user.id,
        partnerId: created.id,
        role: "DELIVERY_PARTNER_OWNER",
        isOwner: true,
      },
    });
    return created;
  });
  return NextResponse.json(
    { partner: { id: partner.id, slug: partner.slug }, status: "PENDING" },
    { status: 201 },
  );
}
