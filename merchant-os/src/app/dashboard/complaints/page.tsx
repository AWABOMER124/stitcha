import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import prisma from "@/lib/db/prisma";

async function reply(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const id = String(formData.get("id"));
  const content = String(formData.get("content") ?? "")
    .trim()
    .slice(0, 2000);
  if (!content) return;
  const complaint = await prisma.complaint.findFirst({
    where: { id, merchantId: session.user.merchantId },
    select: { id: true },
  });
  if (!complaint) return;
  await prisma.$transaction([
    prisma.complaintMessage.create({
      data: {
        complaintId: id,
        content,
        senderType: "MERCHANT",
        senderName: session.user.name ?? "المتجر",
      },
    }),
    prisma.complaint.update({
      where: { id },
      data: { status: "WAITING_CUSTOMER" },
    }),
  ]);
  revalidatePath(`/dashboard/complaints?id=${id}`);
}
async function resolve(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const id = String(formData.get("id"));
  const resolution = String(formData.get("resolution") ?? "")
    .trim()
    .slice(0, 2000);
  if (!resolution) return;
  const result = await prisma.complaint.updateMany({
    where: { id, merchantId: session.user.merchantId },
    data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
  });
  if (result.count)
    await prisma.complaintMessage.create({
      data: {
        complaintId: id,
        content: resolution,
        senderType: "MERCHANT",
        senderName: session.user.name ?? "المتجر",
      },
    });
  revalidatePath("/dashboard/complaints");
}
async function escalate(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const id = String(formData.get("id"));
  const updated = await prisma.complaint.updateMany({
    where: { id, merchantId: session.user.merchantId },
    data: { status: "ESCALATED", priority: "HIGH" },
  });
  if (updated.count)
    await prisma.platformNotificationLog.create({
      data: {
        type: "SYSTEM",
        channel: "IN_APP",
        title: "تم تصعيد شكوى من متجر",
        body: `Complaint ${id} requires platform review`,
        metadata: { complaintId: id },
      },
    });
  revalidatePath("/dashboard/complaints");
}
export default async function MerchantComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const { id } = await searchParams;
  const complaints = await prisma.complaint.findMany({
    where: { merchantId: session.user.merchantId },
    include: {
      order: { select: { orderNumber: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const selected = id
    ? await prisma.complaint.findFirst({
        where: { id, merchantId: session.user.merchantId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          order: { select: { orderNumber: true } },
        },
      })
    : null;
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-black">الشكاوى وخدمة العملاء</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          تابع التذاكر، رد على العميل، صعّد لفريق وصلة، ووثّق الحل.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="divide-y divide-[var(--border)]">
            {complaints.map((c) => (
              <Link
                href={`/dashboard/complaints?id=${c.id}`}
                key={c.id}
                className={`block p-4 hover:bg-[var(--muted)] ${id === c.id ? "bg-[var(--muted)]" : ""}`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-bold">{c.ticketNumber}</p>
                  <span className="text-[10px] font-bold">{c.status}</span>
                </div>
                <p className="mt-1 truncate text-sm">{c.title}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {c.customerName} · {c._count.messages} رسائل{" "}
                  {c.order && `· #${c.order.orderNumber}`}
                </p>
              </Link>
            ))}
            {!complaints.length && (
              <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                لا توجد شكاوى.
              </p>
            )}
          </div>
        </section>
        <section>
          {selected ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {selected.ticketNumber} · {selected.category}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{selected.title}</h2>
                </div>
                <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold">
                  {selected.status}
                </span>
              </div>
              <div className="max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-[var(--muted)]/50 p-4">
                {selected.messages
                  .filter((m) => !m.isInternalNote)
                  .map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderType === "MERCHANT" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${m.senderType === "MERCHANT" ? "bg-[var(--primary)] text-white" : "border bg-[var(--card)]"}`}
                      >
                        <p className="text-[10px] font-bold opacity-65">
                          {m.senderName ?? m.senderType}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-6">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              {!["RESOLVED", "CLOSED"].includes(selected.status) && (
                <>
                  <form action={reply} className="flex gap-2">
                    <input type="hidden" name="id" value={selected.id} />
                    <textarea
                      name="content"
                      required
                      rows={3}
                      className="flex-1 rounded-xl border bg-transparent px-3 py-2"
                      placeholder="اكتب رد المتجر…"
                    />
                    <button className="self-end rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white">
                      رد
                    </button>
                  </form>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={resolve} className="flex gap-2">
                      <input type="hidden" name="id" value={selected.id} />
                      <input
                        name="resolution"
                        required
                        placeholder="ملخص الحل"
                        className="min-w-0 flex-1 rounded-xl border bg-transparent px-3"
                      />
                      <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
                        حل الشكوى
                      </button>
                    </form>
                    <form action={escalate}>
                      <input type="hidden" name="id" value={selected.id} />
                      <button className="w-full rounded-xl border border-amber-300 px-3 py-2 text-sm font-bold text-amber-700">
                        تصعيد لفريق وصلة
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-12 text-center text-[var(--muted-foreground)]">
              اختر شكوى لعرض تفاصيلها.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
