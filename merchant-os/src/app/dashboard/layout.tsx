import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { isMerchantRole } from '@/lib/auth/session';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const role = session.user.role;
  if (role === 'PLATFORM_OWNER') redirect('/admin');
  if (role === 'DISTRIBUTOR_OWNER' || role === 'DISTRIBUTOR_ADMIN') redirect('/distributor/dashboard');
  if (!isMerchantRole(role) || !session.user.merchantId) redirect('/login');

  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
