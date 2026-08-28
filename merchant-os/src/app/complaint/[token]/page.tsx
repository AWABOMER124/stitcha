import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { hashConversationToken } from "@/lib/security/public-conversation";

async function customerReply(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const content = String(formData.get("content") ?? "")
    .trim()
    .slice(0, 2000);
  if (!content) return;
  const complaint = await prisma.complaint.findUnique({
    where: { publicTokenHash: hashConversationToken(token) },
    select: { id: true, merchantId: true, status: true },
  });
  if (!complaint || ["CLOSED", "RESOLVED"].includes(complaint.status)) return;
  const message = await prisma.complaintMessage.create({
    data: {
      complaintId: complaint.id,
      content,
      senderType: "CUSTOMER",
      senderName: "العميل",
    },
  });
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
        body: content.slice(0, 140),
        metadata: { kind: "COMPLAINT", complaintId: complaint.id },
        idempotencyKey: `complaint:reply:${message.id}`,
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
    },
  });
  if (!complaint) notFound();
  const closed = ["CLOSED", "RESOLVED"].includes(complaint.status);
  return (
    <main className="mx-auto max-w-3xl px-5 py-12" dir="rtl">
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
      {complaint.resolution && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">الحل</p>
          <p className="mt-2 text-sm leading-7 text-emerald-900">
            {complaint.resolution}
          </p>
        </div>
      )}
      {!closed && (
        <form action={customerReply} className="mt-5 flex gap-3">
          <input type="hidden" name="token" value={token} />
          <textarea
            name="content"
            required
            rows={3}
            placeholder="أضف رداً أو معلومة جديدة…"
            className="flex-1 rounded-2xl border px-4 py-3"
          />
          <button className="self-end rounded-xl bg-[#087d82] px-5 py-3 font-bold text-white">
            إرسال
          </button>
        </form>
      )}
    </main>
  );
}
