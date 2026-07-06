import { cookies } from "next/headers";
import { LocaleProvider } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-white to-red-50 dark:from-stone-950 dark:via-stone-900 dark:to-red-950/20">
      <LocaleProvider initialLocale={initialLocale}>
        <div className="w-full max-w-md px-4">
          <div className="flex justify-end mb-3">
            <LanguageToggle />
          </div>
          {children}
        </div>
      </LocaleProvider>
    </div>
  );
}
