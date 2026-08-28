import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { hashConversationToken } from "@/lib/security/public-conversation";
import { uploadComplaintAttachment } from "@/modules/complaints/complaint-attachments";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!checkRateLimit(`complaint-upload:${getClientIp(request)}`, 12, 60 * 60_000))
    return NextResponse.json({ error: "محاولات كثيرة، حاول لاحقاً" }, { status: 429 });
  const complaint = await prisma.complaint.findUnique({
    where: { publicTokenHash: hashConversationToken(token) },
    select: { id: true, status: true },
  });
  if (!complaint) return NextResponse.json({ error: "الشكوى غير موجودة" }, { status: 404 });
  if (["CLOSED", "RESOLVED"].includes(complaint.status))
    return NextResponse.json({ error: "الشكوى مغلقة" }, { status: 409 });
  const data = await request.formData().catch(() => null);
  const file = data?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "اختر صورة صحيحة" }, { status: 400 });
  try {
    const attachment = await uploadComplaintAttachment(complaint.id, file, "CUSTOMER");
    return NextResponse.json({ attachment: { id: attachment.id, fileName: attachment.fileName } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر رفع الصورة" }, { status: 400 });
  }
}
