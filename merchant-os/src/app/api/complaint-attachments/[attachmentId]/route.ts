import { auth } from "@/lib/auth/config";
import prisma from "@/lib/db/prisma";
import { isPlatformRole } from "@/lib/platform-permissions";
import { downloadComplaintAttachment } from "@/modules/complaints/complaint-attachments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { attachmentId } = await params;
  const attachment = await prisma.complaintAttachment.findUnique({
    where: { id: attachmentId },
    select: { storageKey: true, complaint: { select: { merchantId: true } } },
  });
  const allowed = attachment && (
    isPlatformRole(session.user.role) ||
    (session.user.merchantId && session.user.merchantId === attachment.complaint.merchantId)
  );
  if (!allowed || !attachment) return new Response("Not found", { status: 404 });
  try {
    const file = await downloadComplaintAttachment(attachment.storageKey);
    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
