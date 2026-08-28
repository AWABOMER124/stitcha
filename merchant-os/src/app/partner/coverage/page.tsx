import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";

async function addArea(formData: FormData) {
  "use server";
  const { partnerId } = await requireDeliveryPartner();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!name || !code) return;
  await prisma.deliveryPartnerServiceArea.create({
    data: {
      partnerId,
      name,
      code,
      city: String(formData.get("city") ?? "").trim() || null,
      estimatedMinutesMin: Number(formData.get("etaMin")) || null,
      estimatedMinutesMax: Number(formData.get("etaMax")) || null,
      isActive: true,
    },
  });
  revalidatePath("/partner/coverage");
}
async function addPrice(formData: FormData) {
  "use server";
  const { partnerId } = await requireDeliveryPartner();
  const baseFee = Number(formData.get("baseFee"));
  if (!Number.isFinite(baseFee) || baseFee < 0) return;
  const serviceAreaId = String(formData.get("serviceAreaId") ?? "") || null;
  await prisma.deliveryPartnerPricingRule.create({
    data: {
      partnerId,
      serviceAreaId,
      baseFee,
      perKmFee: Number(formData.get("perKmFee")) || 0,
      minimumFee: Number(formData.get("minimumFee")) || 0,
      maximumFee: Number(formData.get("maximumFee")) || null,
      maxDistanceKm: Number(formData.get("maxDistanceKm")) || null,
      currency: "SDG",
      isActive: true,
    },
  });
  revalidatePath("/partner/coverage");
}
async function removeRecord(formData: FormData) {
  "use server";
  const { partnerId } = await requireDeliveryPartner();
  const id = String(formData.get("id"));
  const type = String(formData.get("type"));
  if (type === "price")
    await prisma.deliveryPartnerPricingRule.deleteMany({
      where: { id, partnerId },
    });
  if (type === "area")
    await prisma.deliveryPartnerServiceArea.deleteMany({
      where: { id, partnerId },
    });
  revalidatePath("/partner/coverage");
}

export default async function CoveragePage() {
  const { partnerId } = await requireDeliveryPartner();
  const [areas, prices] = await Promise.all([
    prisma.deliveryPartnerServiceArea.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deliveryPartnerPricingRule.findMany({
      where: { partnerId },
      include: { serviceArea: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <div className="space-y-7" dir="rtl">
      <header>
        <h1 className="text-2xl font-black">التغطية والأسعار</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          حدد المدن والمناطق وزمن التوصيل ثم أضف قاعدة تسعير واحدة على الأقل.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-2">
        <Box title="إضافة منطقة خدمة">
          <form action={addArea} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" label="اسم المنطقة" />
            <Input name="code" label="الكود" />
            <Input name="city" label="المدينة" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="etaMin" label="الزمن من" type="number" />
              <Input name="etaMax" label="إلى (دقيقة)" type="number" />
            </div>
            <button className="rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white sm:col-span-2">
              إضافة المنطقة
            </button>
          </form>
        </Box>
        <Box title="إضافة تسعير">
          <form action={addPrice} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              المنطقة
              <select
                name="serviceAreaId"
                className="mt-2 w-full rounded-xl border border-[var(--input)] bg-transparent px-3 py-3"
              >
                <option value="">كل المناطق</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <Input name="baseFee" label="الرسم الأساسي" type="number" />
            <Input name="perKmFee" label="لكل كيلومتر" type="number" />
            <Input name="minimumFee" label="الحد الأدنى" type="number" />
            <Input name="maximumFee" label="الحد الأعلى" type="number" />
            <Input name="maxDistanceKm" label="أقصى مسافة كم" type="number" />
            <button className="rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white sm:col-span-2">
              إضافة التسعير
            </button>
          </form>
        </Box>
      </div>
      <Box title="المناطق الحالية">
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map((a) => (
            <Row
              key={a.id}
              title={a.name}
              note={`${a.city ?? "—"} · ${a.estimatedMinutesMin ?? "—"}–${a.estimatedMinutesMax ?? "—"} دقيقة`}
              id={a.id}
              type="area"
            />
          ))}
          {!areas.length && <Empty />}
        </div>
      </Box>
      <Box title="قواعد التسعير">
        <div className="space-y-3">
          {prices.map((p) => (
            <Row
              key={p.id}
              title={`${p.serviceArea?.name ?? "كل المناطق"} · ${Number(p.baseFee).toLocaleString()} SDG`}
              note={`+ ${Number(p.perKmFee).toLocaleString()} / كم · أقصى مسافة ${p.maxDistanceKm ?? "غير محدد"}`}
              id={p.id}
              type="price"
            />
          ))}
          {!prices.length && <Empty />}
        </div>
      </Box>
    </div>
  );
}
function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-4 font-black">{title}</h2>
      {children}
    </section>
  );
}
function Input({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        required={["name", "code", "baseFee"].includes(name)}
        className="mt-2 w-full rounded-xl border border-[var(--input)] bg-transparent px-3 py-3"
      />
    </label>
  );
}
function Row({
  title,
  note,
  id,
  type,
}: {
  title: string;
  note: string;
  id: string;
  type: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{note}</p>
      </div>
      <form action={removeRecord}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="type" value={type} />
        <button className="text-xs font-bold text-red-600">حذف</button>
      </form>
    </div>
  );
}
function Empty() {
  return (
    <p className="p-5 text-center text-sm text-[var(--muted-foreground)]">
      لا توجد بيانات بعد.
    </p>
  );
}
