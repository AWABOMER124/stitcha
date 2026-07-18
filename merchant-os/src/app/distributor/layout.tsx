import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DistributorSidebar } from '@/components/distributor/sidebar';
import { DistributorTopbar } from '@/components/distributor/topbar';

export default async function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    redirect('/dashboard');
  }

  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        <DistributorSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DistributorTopbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </LocaleProvider>
  );
}
