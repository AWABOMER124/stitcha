import prisma from "@/lib/db/prisma";
import { hashConversationToken } from "@/lib/security/public-conversation";
import { downloadComplaintAttachment } from "@/modules/complaints/complaint-attachments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; attachmentId: string }> },
) {
  const { token, attachmentId } = await params;
  const attachment = await prisma.complaintAttachment.findFirst({
    where: { id: attachmentId, complaint: { publicTokenHash: hashConversationToken(token) } },
    select: { storageKey: true },
  });
  if (!attachment) return new Response("Not found", { status: 404 });
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
