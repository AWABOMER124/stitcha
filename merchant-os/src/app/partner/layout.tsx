import { cookies } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import { LocaleProvider } from "@/lib/i18n/context";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import { AppProviders } from "@/components/ui/app-providers";
import { PartnerSidebar } from "@/components/partner/sidebar";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ partnerId }, cookieStore] = await Promise.all([
    requireDeliveryPartner(),
    cookies(),
  ]);
  const partner = await prisma.deliveryPartner.findUnique({
    where: { id: partnerId },
    select: { name: true },
  });
  const locale =
    (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? "ar";
  return (
    <LocaleProvider initialLocale={locale}>
      <AppProviders>
        <div className="flex h-screen overflow-hidden bg-[var(--background)]">
          <PartnerSidebar name={partner?.name ?? "—"} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-5">
              <p className="font-black">بوابة شريك التوصيل</p>
            <Link
              href="/api/auth/signout"
                className="text-sm text-[var(--muted-foreground)]"
              >
                تسجيل الخروج
            </Link>
            </header>
            <nav aria-label="تنقل الشريك" className="flex gap-4 overflow-x-auto border-b p-3 text-sm lg:hidden">
              <Link href="/partner">الرئيسية</Link><Link href="/partner/shipments">الشحنات</Link>
              <Link href="/partner/coverage">المناطق والأسعار</Link><Link href="/partner/settings">التطبيق والربط</Link>
            </nav>
            <main className="flex-1 overflow-y-auto p-5 lg:p-7">
              {children}
            </main>
          </div>
        </div>
      </AppProviders>
    </LocaleProvider>
  );
}
