import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { hashConversationToken } from "@/lib/security/public-conversation";
import { uploadComplaintAttachment } from "@/modules/complaints/complaint-attachments";
import { LiveRefresh } from "@/components/shared/live-refresh";

async function customerReply(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const content = String(formData.get("content") ?? "")
    .trim()
    .slice(0, 2000);
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (!content && files.length === 0) return;
  const complaint = await prisma.complaint.findUnique({
    where: { publicTokenHash: hashConversationToken(token) },
    select: { id: true, merchantId: true, status: true },
  });
  if (!complaint || ["CLOSED", "RESOLVED"].includes(complaint.status)) return;
  const message = content ? await prisma.complaintMessage.create({
    data: { complaintId: complaint.id, content, senderType: "CUSTOMER", senderName: "العميل" },
  }) : null;
  for (const file of files.slice(0, 5))
    await uploadComplaintAttachment(complaint.id, file, "CUSTOMER").catch(() => null);
  await prisma.complaint.update({
    where: { id: complaint.id },
    data: { status: "WAITING_MERCHANT" },
  });
  await prisma.notificationLog
    .create({
      data: {
        merchantId: complaint.merchantId,
        type: "SYSTEM",
        channel: "IN_APP",
        recipient: complaint.merchantId,
        title: "رد جديد على شكوى",
        body: content.slice(0, 140) || "أرفق العميل صوراً جديدة",
        metadata: { kind: "COMPLAINT", complaintId: complaint.id },
        idempotencyKey: `complaint:reply:${message?.id ?? `attachment:${Date.now()}`}`,
      },
    })
    .catch(() => null);
  revalidatePath(`/complaint/${token}`);
}
export default async function ComplaintTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const complaint = await prisma.complaint.findUnique({
    where: { publicTokenHash: hashConversationToken(token) },
    include: {
      merchant: { select: { name: true } },
      messages: {
        where: { isInternalNote: false },
        orderBy: { createdAt: "asc" },
      },
      order: { select: { orderNumber: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint) notFound();
  const closed = ["CLOSED", "RESOLVED"].includes(complaint.status);
  return (
    <main className="mx-auto max-w-3xl px-5 py-12" dir="rtl">
      <LiveRefresh intervalMs={5000} />
      <header className="rounded-3xl bg-[#07111f] p-7 text-white">
        <p className="text-sm text-emerald-300">{complaint.ticketNumber}</p>
        <h1 className="mt-2 text-2xl font-black">{complaint.title}</h1>
        <p className="mt-3 text-sm text-slate-300">
          {complaint.merchant.name} · الحالة: {complaint.status}
          {complaint.order && ` · الطلب #${complaint.order.orderNumber}`}
        </p>
      </header>
      <section className="mt-5 space-y-3 rounded-3xl border bg-stone-50 p-5">
        {complaint.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.senderType === "CUSTOMER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 ${m.senderType === "CUSTOMER" ? "bg-[#087d82] text-white" : "border bg-white"}`}
            >
              <p className="text-xs font-bold opacity-65">
                {m.senderType === "CUSTOMER"
                  ? "أنت"
                  : m.senderType === "MERCHANT"
                    ? "المتجر"
                    : "فريق وصلة"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                {m.content}
              </p>
              <p className="mt-1 text-[10px] opacity-55">
                {m.createdAt.toLocaleString("ar-SD")}
              </p>
            </div>
          </div>
        ))}
      </section>
      {complaint.attachments.length > 0 && (
        <section className="mt-5 rounded-3xl border bg-white p-5">
          <h2 className="font-black">الصور المرفقة</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {complaint.attachments.map((attachment) => (
              <a key={attachment.id} href={`/api/complaints/${token}/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/complaints/${token}/attachments/${attachment.id}`} alt={attachment.fileName} className="h-32 w-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}
      {complaint.resolution && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">الحل</p>
          <p className="mt-2 text-sm leading-7 text-emerald-900">
            {complaint.resolution}
          </p>
        </div>
      )}
      {!closed && (
        <form action={customerReply} className="mt-5 grid gap-3 rounded-2xl border bg-white p-4">
          <input type="hidden" name="token" value={token} />
          <textarea
            name="content"
            rows={3}
            placeholder="أضف رداً أو معلومة جديدة…"
            className="rounded-2xl border px-4 py-3"
          />
          <input name="attachments" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" />
          <button className="justify-self-end rounded-xl bg-[#087d82] px-5 py-3 font-bold text-white">
            إرسال
          </button>
        </form>
      )}
    </main>
  );
}
