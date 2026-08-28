import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { createConversationToken } from "@/lib/security/public-conversation";

const schema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().max(32).optional(),
    customerEmail: z
      .string()
      .trim()
      .email()
      .max(254)
      .optional()
      .or(z.literal("")),
    orderNumber: z.string().trim().max(40).optional(),
    category: z.enum([
      "ORDER",
      "DELIVERY",
      "PAYMENT",
      "PRODUCT",
      "SERVICE",
      "OTHER",
    ]),
    title: z.string().trim().min(4).max(160),
    description: z.string().trim().min(10).max(4000),
  })
  .strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (
    !checkRateLimit(`complaint:${slug}:${getClientIp(request)}`, 5, 60 * 60_000)
  )
    return NextResponse.json(
      { error: "محاولات كثيرة، حاول لاحقاً" },
      { status: 429 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "راجع بيانات الشكوى" }, { status: 400 });
  const merchant = await prisma.merchant.findFirst({
    where: { slug, status: "ACTIVE", isActive: true },
    select: { id: true },
  });
  if (!merchant)
    return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
  const order = parsed.data.orderNumber
    ? await prisma.order.findFirst({
        where: {
          merchantId: merchant.id,
          orderNumber: parsed.data.orderNumber,
        },
        select: { id: true },
      })
    : null;
  if (parsed.data.orderNumber && !order)
    return NextResponse.json({ error: "رقم الطلب غير صحيح" }, { status: 400 });
  const access = createConversationToken();
  const complaint = await prisma.$transaction(async (tx) => {
    const created = await tx.complaint.create({
      data: {
        ticketNumber: `WSL-CMP-${nanoid(8).toUpperCase()}`,
        merchantId: merchant.id,
        orderId: order?.id,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone || null,
        customerEmail: parsed.data.customerEmail || null,
        publicTokenHash: access.hash,
        messages: {
          create: {
            content: parsed.data.description,
            senderType: "CUSTOMER",
            senderName: parsed.data.customerName,
          },
        },
      },
    });
    await tx.notificationLog.create({
      data: {
        merchantId: merchant.id,
        type: "SYSTEM",
        channel: "IN_APP",
        recipient: merchant.id,
        title: "شكوى جديدة",
        body: `${created.ticketNumber}: ${created.title}`,
        metadata: { kind: "COMPLAINT", complaintId: created.id },
        idempotencyKey: `complaint:new:${created.id}`,
      },
    });
    await tx.platformNotificationLog.create({
      data: {
        type: "SYSTEM",
        channel: "IN_APP",
        title: "شكوى متجر جديدة",
        body: `${created.ticketNumber}: ${created.title}`,
        metadata: { complaintId: created.id, merchantId: merchant.id },
      },
    });
    return created;
  });
  return NextResponse.json(
    {
      ticketNumber: complaint.ticketNumber,
      token: access.token,
      url: `/complaint/${access.token}`,
    },
    { status: 201 },
  );
}
