import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import { LocaleProvider } from "@/lib/i18n/context";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import { AppProviders } from "@/components/ui/app-providers";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { Bell, BookOpenText, LogOut } from 'lucide-react';

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ partnerId, verified }, cookieStore] = await Promise.all([
    requireDeliveryPartner(),
    cookies(),
  ]);
  const partner = await prisma.deliveryPartner.findUnique({
    where: { id: partnerId },
    select: { name: true, status: true, appStatus: true },
  });
  const locale =
    (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? "ar";
  return (
    <LocaleProvider initialLocale={locale}>
      <AppProviders>
        <div className="flex h-screen overflow-hidden bg-[#f6f8fb]">
          <PartnerSidebar name={partner?.name ?? "—"} status={partner?.status ?? 'PENDING'} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex min-h-20 items-center justify-between border-b border-[var(--border)] bg-white px-5 lg:px-8">
              <div><p className="font-black">مساحة عمل الشريك</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">تطبيق الشحن · {partner?.appStatus === 'PUBLISHED' ? 'منشور' : 'قيد التجهيز'}</p></div>
              <div className="flex items-center gap-2">
                <Link href="/partner/docs" aria-label="دليل الربط" className="grid size-10 place-items-center rounded-xl border bg-white text-slate-600 hover:text-[var(--primary)]"><BookOpenText className="size-4" /></Link>
                <span aria-label="الإشعارات" className="grid size-10 place-items-center rounded-xl border bg-white text-slate-600"><Bell className="size-4" /></span>
                <Link href="/api/auth/signout" className="flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold text-slate-600 hover:border-red-200 hover:text-red-600"><LogOut className="size-4" /><span className="hidden sm:inline">تسجيل الخروج</span></Link>
              </div>
            </header>
            <nav aria-label="تنقل الشريك" className="flex gap-2 overflow-x-auto border-b bg-white p-3 text-sm lg:hidden">
              {[['الرئيسية','/partner'],['الشحنات','/partner/shipments'],['التغطية','/partner/coverage'],['التطبيق والربط','/partner/settings'],['دليل API','/partner/docs'],['الاختبار','/partner/sandbox'],['الأمان','/partner/security']].map(([label,href]) => <Link key={href} href={href} className="shrink-0 rounded-full border px-3 py-2 font-bold">{label}</Link>)}
            </nav>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              {!verified && <Link href="/partner/security" className="mb-5 block rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">حسابك غير مؤكّد — أكّد البريد الإلكتروني لإكمال خطوات الشراكة.</Link>}
              {children}
            </main>
          </div>
        </div>
      </AppProviders>
    </LocaleProvider>
  );
}
