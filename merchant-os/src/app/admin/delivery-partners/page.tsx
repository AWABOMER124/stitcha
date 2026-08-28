import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import {
  PLATFORM_PERMISSIONS,
  requirePlatformPermission,
} from "@/lib/platform-permissions";

async function createTestPartner() {
  "use server";
  await requirePlatformPermission(PLATFORM_PERMISSIONS.DELIVERY_MANAGE);
  await prisma.$transaction(async (tx) => {
    const partner = await tx.deliveryPartner.upsert({
      where: { slug: "wasla-test-delivery" },
      create: {
        name: "وصلة للتوصيل التجريبي",
        slug: "wasla-test-delivery",
        description: "شريك محاكاة لاختبار دورة الشحنة قبل ربط شركة حقيقية.",
        appName: "Wasla Test Delivery",
        appDescription:
          "بيئة آمنة لاختبار عروض الأسعار وإنشاء الشحنة وعكس الحالات.",
        status: "ACTIVE",
        appStatus: "PUBLISHED",
        supportsCod: true,
        isActive: true,
      },
      update: {
        status: "ACTIVE",
        appStatus: "PUBLISHED",
        supportsCod: true,
        isActive: true,
      },
    });
    await tx.deliveryPartnerProviderConfig.upsert({
      where: { partnerId: partner.id },
      create: {
        partnerId: partner.id,
        providerKey: "TEST_SIMULATOR",
        isActive: true,
      },
      update: { providerKey: "TEST_SIMULATOR", isActive: true },
    });
    const area = await tx.deliveryPartnerServiceArea.upsert({
      where: { partnerId_code: { partnerId: partner.id, code: "KRT-TEST" } },
      create: {
        partnerId: partner.id,
        code: "KRT-TEST",
        name: "الخرطوم التجريبية",
        city: "الخرطوم",
        centerLat: 15.5007,
        centerLng: 32.5599,
        radiusKm: 60,
        estimatedMinutesMin: 30,
        estimatedMinutesMax: 90,
      },
      update: { isActive: true },
    });
    const existing = await tx.deliveryPartnerPricingRule.findFirst({
      where: { partnerId: partner.id, serviceAreaId: area.id },
    });
    if (!existing)
      await tx.deliveryPartnerPricingRule.create({
        data: {
          partnerId: partner.id,
          serviceAreaId: area.id,
          baseFee: 1500,
          perKmFee: 150,
          minimumFee: 1500,
          maximumFee: 8000,
          maxDistanceKm: 60,
          currency: "SDG",
          priority: 100,
        },
      });
  });
  revalidatePath("/admin/delivery-partners");
}

export const dynamic = "force-dynamic";

async function updatePartner(formData: FormData) {
  "use server";
  await requirePlatformPermission(PLATFORM_PERMISSIONS.DELIVERY_MANAGE);
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id) return;
  if (intent === "activate")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { status: "ACTIVE", isActive: true },
    });
  if (intent === "suspend")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { status: "SUSPENDED", isActive: false },
    });
  if (intent === "enable-cod")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { supportsCod: true },
    });
  if (intent === "disable-cod")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { supportsCod: false },
    });
  if (intent === "publish")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { appStatus: "PUBLISHED" },
    });
  if (intent === "reject")
    await prisma.deliveryPartner.update({
      where: { id },
      data: { appStatus: "REJECTED" },
    });
  revalidatePath("/admin/delivery-partners");
}

export default async function DeliveryPartnersPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.DELIVERY_MANAGE);
  const partners = await prisma.deliveryPartner.findMany({
    include: {
      _count: {
        select: { serviceAreas: true, couriers: true, shipments: true },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Delivery partners · شركاء التوصيل
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Review ownership and capabilities before activating live delivery.
          </p>
        </div>
        <form action={createTestPartner}>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-bold">
            إنشاء/تحديث الشريك التجريبي
          </button>
        </form>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {partners.map((partner) => (
          <article
            key={partner.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">
                  {partner.appName ?? partner.name}
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {partner.phone ?? "No phone"} · {partner.slug}
                </p>
              </div>
              <div className="text-end">
                <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold">
                  {partner.status}
                </span>
                <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                  APP: {partner.appStatus}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <dt className="text-[var(--muted-foreground)]">Areas</dt>
                <dd className="font-bold">{partner._count.serviceAreas}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Couriers</dt>
                <dd className="font-bold">{partner._count.couriers}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Shipments</dt>
                <dd className="font-bold">{partner._count.shipments}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={updatePartner}>
                <input type="hidden" name="id" value={partner.id} />
                <input
                  type="hidden"
                  name="intent"
                  value={partner.status === "ACTIVE" ? "suspend" : "activate"}
                />
                <button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white">
                  {partner.status === "ACTIVE" ? "Suspend" : "Approve"}
                </button>
              </form>
              <form action={updatePartner}>
                <input type="hidden" name="id" value={partner.id} />
                <input
                  type="hidden"
                  name="intent"
                  value={partner.supportsCod ? "disable-cod" : "enable-cod"}
                />
                <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                  COD: {partner.supportsCod ? "Enabled" : "Disabled"}
                </button>
              </form>
              {partner.appStatus === "SUBMITTED" && (
                <>
                  <form action={updatePartner}>
                    <input type="hidden" name="id" value={partner.id} />
                    <input type="hidden" name="intent" value="publish" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">
                      Publish app
                    </button>
                  </form>
                  <form action={updatePartner}>
                    <input type="hidden" name="id" value={partner.id} />
                    <input type="hidden" name="intent" value="reject" />
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">
                      Reject
                    </button>
                  </form>
                </>
              )}
            </div>
          </article>
        ))}
        {partners.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-[var(--muted-foreground)]">
            No delivery partners yet.
          </p>
        )}
      </div>
    </div>
  );
}
