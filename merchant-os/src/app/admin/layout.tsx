import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';
import { AppProviders } from '@/components/ui/app-providers';
import { MobileNavProvider } from '@/components/ui/mobile-nav-context';
import { SkipLink } from '@/components/ui/skip-link';
import { isPlatformRole } from '@/lib/platform-permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!isPlatformRole(session.user.role)) redirect('/dashboard');

  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <AppProviders>
        <MobileNavProvider>
          <SkipLink />
          <div className="flex h-screen overflow-hidden bg-[var(--background)]">
            <AdminSidebar role={session.user.role} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <AdminTopbar />
              <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6 focus:outline-none">{children}</main>
            </div>
          </div>
        </MobileNavProvider>
      </AppProviders>
    </LocaleProvider>
  );
}
