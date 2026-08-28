import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import * as ordersService from "@/modules/orders/services/orders.service";

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
  await prisma.platformShipment.update({
    where: { id },
    data: {
      status: status as never,
      ...(status === "ASSIGNED" ? { assignedAt: new Date() } : {}),
      ...(status === "PICKED_UP" ? { pickedUpAt: new Date() } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      events: {
        create: {
          status: status as never,
          actorType: "DELIVERY_PARTNER",
          actorId: userId,
        },
      },
    },
  });
  if (
    ["PICKED_UP", "IN_TRANSIT"].includes(status) &&
    shipment.order.status !== "OUT_FOR_DELIVERY"
  )
    await ordersService
      .updateOrderStatus(
        shipment.order.merchantId,
        shipment.orderId,
        "OUT_FOR_DELIVERY",
        `Delivery partner: ${status}`,
        userId,
      )
      .catch(() => null);
  if (status === "DELIVERED" && shipment.order.status !== "DELIVERED")
    await ordersService
      .updateOrderStatus(
        shipment.order.merchantId,
        shipment.orderId,
        "DELIVERED",
        "Delivery partner confirmed delivery",
        userId,
      )
      .catch(() => null);
  revalidatePath("/partner/shipments");
}
export default async function ShipmentsPage() {
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
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-black">الشحنات</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          استلام الطلبات وتحديث حالتها ينعكس مباشرةً للتاجر والعميل.
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
                {s.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="me-auto text-sm font-bold">
                {Number(s.fee).toLocaleString()} SDG
              </span>
              {(transitions[s.status] ?? []).map((next) => (
                <form action={updateShipment} key={next}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    name="status"
                    value={next}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold hover:border-[var(--primary)]"
                  >
                    {next}
                  </button>
                </form>
              ))}
            </div>
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
