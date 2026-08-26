import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import "@fontsource-variable/alexandria";
import "@fontsource-variable/inter";
import "./globals.css";
import { brand } from '@/config/brand.config';

export const metadata: Metadata = {
  title: {
    default: brand.displayName,
    template: `%s | ${brand.displayName}`,
  },
  description:
    brand.descriptionAr,
  applicationName: brand.displayName,
  manifest: '/manifest.webmanifest',
  icons: { icon: brand.logos.symbol, apple: brand.logos.symbol },
  openGraph: { title: brand.displayName, description: brand.descriptionAr, type: 'website' },
};

export const viewport: Viewport = { themeColor: '#07111F' };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
