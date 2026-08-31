import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import { applyShipmentState } from '@/modules/delivery-partners/services/shipment-state.service';
import { LiveRefresh } from '@/components/shared/live-refresh';
import { redirect } from 'next/navigation';
import { BusinessRuleError } from '@/lib/errors';

const labels: Record<string, string> = { REQUESTED: 'بانتظار الإسناد', ASSIGNED: 'تم الإسناد', PICKED_UP: 'تم الاستلام', IN_TRANSIT: 'في الطريق', DELIVERED: 'تم التسليم', FAILED: 'تعذر التسليم', CANCELLED: 'ملغاة' };

async function retryDispatch(formData: FormData) {
  'use server';
  const { partnerId } = await requireDeliveryPartner();
  const shipment = await prisma.platformShipment.findFirst({ where: { id: String(formData.get('id')), partnerId, status: 'REQUESTED', providerReference: null } });
  if (!shipment) return;
  await prisma.outboxJob.updateMany({ where: { idempotencyKey: `delivery:dispatch:${shipment.id}`, status: 'FAILED' }, data: { status: 'PENDING', attempts: 0, availableAt: new Date(), lastError: null, lockedAt: null, lockedBy: null } });
  revalidatePath('/partner/shipments');
}

const transitions: Record<string, string[]> = {
  REQUESTED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
};
async function updateShipment(formData: FormData) {
  "use server";
  const { partnerId, userId } = await requireDeliveryPartner();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const shipment = await prisma.platformShipment.findFirst({
    where: { id, partnerId },
    include: { order: { select: { merchantId: true, status: true } } },
  });
  if (!shipment || !transitions[shipment.status]?.includes(status)) return;
  try {
    await applyShipmentState({ shipmentId: id, partnerId, status: status as import('@prisma/client').PlatformShipmentStatus, actorType: 'DELIVERY_PARTNER', actorId: userId });
  } catch (error) {
    if (error instanceof BusinessRuleError) redirect('/partner/shipments?error=transition');
    throw error;
  }
  revalidatePath("/partner/shipments");
}
export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { partnerId } = await requireDeliveryPartner();
  const shipments = await prisma.platformShipment.findMany({
    where: { partnerId },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          customerAddress: true,
          total: true,
        },
      },
      courier: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const jobs = await prisma.outboxJob.findMany({ where: { idempotencyKey: { in: shipments.map(s => `delivery:dispatch:${s.id}`) } }, select: { idempotencyKey: true, status: true, attempts: true } });
  const jobsByShipment = new Map(jobs.map(job => [job.idempotencyKey, job]));
  return (
    <div className="space-y-6" dir="rtl">
      <LiveRefresh />
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">تعذر تغيير الحالة. تأكد من جاهزية الطلب لدى التاجر وحدّث الصفحة قبل المحاولة.</p>}
      <header>
        <h1 className="text-2xl font-black">الشحنات</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          تحديث الحالة ينعكس على الطلب. تتحدث هذه الشاشة تلقائياً كل خمس ثوانٍ.
        </p>
      </header>
      <div className="space-y-3">
        {shipments.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">
                  #{s.order.orderNumber} · {s.trackingCode}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {s.order.customerName} · {s.order.customerPhone} ·{" "}
                  {s.order.customerAddress}
                </p>
              </div>
              <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold">
                {labels[s.status] ?? s.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="me-auto text-sm font-bold">
                {Number(s.fee).toLocaleString()} {s.currency}
              </span>
              {(transitions[s.status] ?? []).map((next) => (
                <form action={updateShipment} key={next}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    name="status"
                    value={next}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold hover:border-[var(--primary)]"
                  >
                    {labels[next] ?? next}
                  </button>
                </form>
              ))}
            </div>
            {!s.providerReference && jobsByShipment.has(`delivery:dispatch:${s.id}`) && <div className="mt-3 rounded-xl bg-[var(--muted)] p-3 text-sm">
              {jobsByShipment.get(`delivery:dispatch:${s.id}`)?.status === 'FAILED' ? <form action={retryDispatch}>
                <input type="hidden" name="id" value={s.id} />
                <span>تعذر الربط بعد عدة محاولات. راجع إعدادات API ثم </span>
                <button className="font-bold underline">أعد محاولة إرسال الشحنة</button>
              </form> : 'إرسال الشحنة محفوظ في صف المعالجة؛ ستعاد المحاولة تلقائياً عند تعذر الاتصال.'}
            </div>}
          </article>
        ))}
        {!shipments.length && (
          <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)]">
            لا توجد شحنات مسندة بعد.
          </p>
        )}
      </div>
    </div>
  );
}
