import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import {
  PLATFORM_PERMISSIONS,
  requirePlatformPermission,
} from "@/lib/platform-permissions";
import { LiveRefresh } from "@/components/shared/live-refresh";

async function updateComplaint(formData: FormData) {
  "use server";
  const user = await requirePlatformPermission(
    PLATFORM_PERMISSIONS.MERCHANTS_MANAGE,
  );
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 2000);
  const allowed = [
    "UNDER_REVIEW",
    "WAITING_MERCHANT",
    "WAITING_CUSTOMER",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
  ];
  if (!allowed.includes(status)) return;
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id },
      data: {
        status: status as never,
        assignedToId: user.id,
        ...(status === "RESOLVED"
          ? {
              resolution: note || "تم الحل بواسطة فريق وصلة",
              resolvedAt: new Date(),
            }
          : {}),
        ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    });
    if (note)
      await tx.complaintMessage.create({
        data: {
          complaintId: id,
          content: note,
          senderType: "PLATFORM",
          senderName: user.name ?? "فريق وصلة",
        },
      });
  });
  revalidatePath("/admin/complaints");
}
export default async function AdminComplaintsPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
  const complaints = await prisma.complaint.findMany({
    include: {
      merchant: { select: { name: true } },
      order: { select: { orderNumber: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return (
    <div className="space-y-6" dir="rtl">
      <LiveRefresh intervalMs={5000} />
      <header>
        <h1 className="text-2xl font-black">مركز الشكاوى</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          رقابة المنصة على شكاوى المتاجر والتصعيد والحلول.
        </p>
      </header>
      <div className="space-y-4">
        {complaints.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--primary)]">
                  {c.ticketNumber} · {c.merchant.name}
                </p>
                <h2 className="mt-1 font-black">{c.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {c.customerName} · {c.category} · {c.priority}{" "}
                  {c.order && `· الطلب #${c.order.orderNumber}`}
                </p>
              </div>
              <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold">
                {c.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7">{c.description}</p>
            {c.attachments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.attachments.map((attachment) => (
                  <a key={attachment.id} href={`/api/complaint-attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-xs font-bold text-[var(--primary)]">
                    فتح الصورة: {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-4 rounded-xl bg-[var(--muted)]/60 p-3 text-xs">
              آخر رد: {c.messages[0]?.content ?? "—"}
            </div>
            <form
              action={updateComplaint}
              className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]"
            >
              <input type="hidden" name="id" value={c.id} />
              <select
                name="status"
                defaultValue={c.status}
                className="rounded-xl border bg-transparent px-3 py-2"
              >
                <option value="UNDER_REVIEW">قيد المراجعة</option>
                <option value="WAITING_MERCHANT">بانتظار المتجر</option>
                <option value="WAITING_CUSTOMER">بانتظار العميل</option>
                <option value="ESCALATED">مصعّدة</option>
                <option value="RESOLVED">محلولة</option>
                <option value="CLOSED">مغلقة</option>
              </select>
              <input
                name="note"
                placeholder="رد أو ملاحظة للعميل والمتجر"
                className="rounded-xl border bg-transparent px-3 py-2"
              />
              <button className="rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white">
                تحديث
              </button>
            </form>
          </article>
        ))}
        {!complaints.length && (
          <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)]">
            لا توجد شكاوى.
          </p>
        )}
      </div>
    </div>
  );
}
