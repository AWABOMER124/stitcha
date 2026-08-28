import Link from "next/link";
import {
  getPlatformStatsAction,
  getRecentActivityAction,
} from "@/modules/admin/actions";
import {
  PLATFORM_PERMISSIONS,
  requirePlatformPermission,
} from "@/lib/platform-permissions";
import prisma from "@/lib/db/prisma";

type Stats = {
  totalMerchants: number;
  activeMerchants: number;
  pendingMerchants: number;
  suspendedMerchants: number;
  totalOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  newMerchantsThisMonth: number;
  pendingSubscriptionPayments: number;
  activeSubscriptions: number;
};
type Activity = {
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    merchant: { name: string } | null;
  }>;
  recentMerchants: Array<{
    id: string;
    name: string;
    status: string;
    businessType: string;
  }>;
};

export default async function AdminDashboardPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.DASHBOARD);
  const [statsResult, activityResult, openComplaints, pendingPartnerApps] =
    await Promise.all([
      getPlatformStatsAction(),
      getRecentActivityAction(),
      prisma.complaint.count({
        where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
      }),
      prisma.deliveryPartner.count({
        where: { OR: [{ status: "PENDING" }, { appStatus: "SUBMITTED" }] },
      }),
    ]);
  const stats = statsResult.success ? (statsResult.data as Stats) : null;
  const activity = activityResult.success
    ? (activityResult.data as Activity)
    : null;
  const cards = [
    [
      "🏪",
      "إجمالي التجار",
      stats?.totalMerchants ?? 0,
      `${stats?.activeMerchants ?? 0} نشط`,
      "/admin/merchants",
    ],
    [
      "✨",
      "تجار جدد هذا الشهر",
      stats?.newMerchantsThisMonth ?? 0,
      "نمو قاعدة التجار",
      "/admin/merchants",
    ],
    [
      "📦",
      "إجمالي الطلبات",
      stats?.totalOrders ?? 0,
      `${stats?.deliveredOrders ?? 0} تم تسليمه`,
      "/admin/merchants",
    ],
    [
      "💎",
      "اشتراكات نشطة",
      stats?.activeSubscriptions ?? 0,
      `${stats?.pendingSubscriptionPayments ?? 0} تحويل ينتظر المراجعة`,
      "/admin/subscription-payments",
    ],
    [
      "🛟",
      "شكاوى مفتوحة",
      openComplaints,
      "تحتاج متابعة فريق التشغيل",
      "/admin/complaints",
    ],
    [
      "🚚",
      "طلبات شركاء التوصيل",
      pendingPartnerApps,
      "اعتماد الحساب أو نشر التطبيق",
      "/admin/delivery-partners",
    ],
  ];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">مركز تشغيل وصلة</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          صورة مباشرة عن التجار والطلبات والاشتراكات.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([icon, label, value, note, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40"
          >
            <span className="text-2xl">{icon}</span>
            <p className="mt-4 text-xs font-semibold text-[var(--muted-foreground)]">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black">
              {Number(value).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {note}
            </p>
          </Link>
        ))}
      </div>
      {stats?.pendingMerchants ||
      stats?.suspendedMerchants ||
      stats?.pendingSubscriptionPayments ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Alert
            label="تجار ينتظرون المراجعة"
            value={stats?.pendingMerchants ?? 0}
            href="/admin/merchants?status=PENDING"
          />
          <Alert
            label="تجار موقوفون"
            value={stats?.suspendedMerchants ?? 0}
            href="/admin/merchants?status=SUSPENDED"
          />
          <Alert
            label="تحويلات اشتراك معلّقة"
            value={stats?.pendingSubscriptionPayments ?? 0}
            href="/admin/subscription-payments"
          />
        </div>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="font-bold">أحدث التجار</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity?.recentMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-bold">{merchant.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {merchant.businessType}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-bold">
                  {merchant.status}
                </span>
              </div>
            ))}
            {!activity?.recentMerchants.length && (
              <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                لا يوجد تجار بعد
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="font-bold">أحدث الطلبات</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity?.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-bold">
                    #{order.orderNumber} · {order.merchant?.name ?? "—"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {Number(order.total).toLocaleString()} SDG
                  </p>
                </div>
                <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-bold">
                  {order.status}
                </span>
              </div>
            ))}
            {!activity?.recentOrders.length && (
              <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                لا توجد طلبات بعد
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Alert({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-black">
        {value}
      </span>
    </Link>
  );
}
