import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import prisma from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.merchantId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversations = await prisma.conversation.findMany({
    where: { merchantId: session.user.merchantId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { isFromCustomer: true, readAt: null } },
        },
      },
    },
  });
  return NextResponse.json({ conversations });
}
