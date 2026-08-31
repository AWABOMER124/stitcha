import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import prisma from "@/lib/db/prisma";
import { ExternalImage } from "@/components/external-image";
import Link from 'next/link';

async function togglePartner(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const partnerId = String(formData.get("partnerId"));
  const enabled = String(formData.get("enabled")) === "true";
  const partner = await prisma.deliveryPartner.findFirst({
    where: {
      id: partnerId,
      status: "ACTIVE",
      isActive: true,
      appStatus: "PUBLISHED",
    },
    select: { id: true },
  });
  if (!partner) return;
  await prisma.merchantDeliveryPartner.upsert({
    where: {
      merchantId_partnerId: { merchantId: session.user.merchantId, partnerId },
    },
    create: {
      merchantId: session.user.merchantId,
      partnerId,
      isActive: enabled,
    },
    update: { isActive: enabled },
  });
  revalidatePath("/dashboard/delivery/partners");
}

export default async function DeliveryMarketplacePage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect("/login");
  const partners = await prisma.deliveryPartner.findMany({
    where: { status: "ACTIVE", isActive: true, appStatus: "PUBLISHED" },
    include: {
      serviceAreas: { where: { isActive: true }, take: 4 },
      pricingRules: {
        where: { isActive: true },
        orderBy: { baseFee: "asc" },
        take: 1,
      },
      merchantConnections: {
        where: { merchantId: session.user.merchantId },
        take: 1,
      },
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <p className="text-sm font-bold text-[var(--primary)]">
          سوق تطبيقات وصلة
        </p>
        <h1 className="mt-1 text-2xl font-black">شركاء التوصيل</h1>
        <Link href="/dashboard/delivery/partners/docs" className="mt-3 inline-block text-sm font-bold underline">دليل تفعيل الشحن والربط وAPI</Link>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          اختر الشركات التي تريد استقبال عروضها لطلبات متجرك. يمكنك تعطيل أي
          شريك في أي وقت.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        {partners.map((p) => {
          const connected = p.merchantConnections[0]?.isActive ?? false;
          return (
            <article
              key={p.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
            >
              <div className="flex items-start gap-4">
                {p.appIcon ? (
                  <ExternalImage
                    src={p.appIcon}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-2xl border object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">
                    🚚
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">{p.appName ?? p.name}</h2>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    ⭐ {Number(p.rating).toFixed(1)} ·{" "}
                    {p.completedDeliveries.toLocaleString()} توصيلة
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-[var(--muted)]"}`}
                >
                  {connected ? "مفعّل" : "غير مفعّل"}
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {p.appDescription ??
                  p.description ??
                  "خدمة توصيل متكاملة للمتاجر."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {p.supportsCod && (
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    تحصيل عند التسليم
                  </span>
                )}
                {p.serviceAreas.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-lg bg-[var(--muted)] px-2.5 py-1"
                  >
                    {a.name}
                  </span>
                ))}
                {p.pricingRules[0] && (
                  <span className="rounded-lg bg-[var(--muted)] px-2.5 py-1">
                    من {Number(p.pricingRules[0].baseFee).toLocaleString()} SDG
                  </span>
                )}
              </div>
              <form action={togglePartner} className="mt-5">
                <input type="hidden" name="partnerId" value={p.id} />
                <button
                  name="enabled"
                  value={String(!connected)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold ${connected ? "border border-red-200 text-red-600" : "bg-[var(--primary)] text-white"}`}
                >
                  {connected ? "إلغاء التفعيل" : "تفعيل الشريك"}
                </button>
              </form>
            </article>
          );
        })}
        {!partners.length && (
          <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)] lg:col-span-2">
            لا توجد تطبيقات توصيل منشورة بعد.
          </p>
        )}
      </div>
    </div>
  );
}
