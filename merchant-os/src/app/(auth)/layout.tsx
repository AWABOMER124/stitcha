import { cookies } from "next/headers";
import { LocaleProvider } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import { WaslaLogo } from '@/components/brand/wasla-logo';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <LocaleProvider initialLocale={initialLocale}>
        <div className="w-full max-w-md px-4">
          <div className="flex justify-end mb-3">
            <LanguageToggle />
          </div>
          <div className="mb-6 flex justify-center"><WaslaLogo /></div>
          {children}
        </div>
      </LocaleProvider>
    </div>
  );
}
