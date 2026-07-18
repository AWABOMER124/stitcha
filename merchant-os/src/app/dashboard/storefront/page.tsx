import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export default async function StorefrontPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [merchant, cookieStore] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id: session.user.merchantId },
      include: { storefrontSettings: true },
    }),
    cookies(),
  ]);

  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].storefrontHomePage;

  const settings = merchant?.storefrontSettings;
  const storeUrl = merchant ? `/store/${merchant.slug}` : '#';

  const links = [
    { href: '/dashboard/storefront/customize', icon: '🎨', title: t.linkCustomizeTitle, desc: t.linkCustomizeDesc },
    { href: '/dashboard/storefront/ai', icon: '🤖', title: t.linkAiTitle, desc: t.linkAiDesc },
    { href: '/dashboard/products', icon: '📦', title: t.linkProductsTitle, desc: t.linkProductsDesc },
    { href: '/dashboard/inbox', icon: '💬', title: t.linkInboxTitle, desc: t.linkInboxDesc },
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">{t.subtitle}</p>
        </div>
        <a href={storeUrl} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          {t.viewStore}
        </a>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t.statStoreStatus, value: settings?.isOpen ? t.statOpen : t.statClosed, icon: settings?.isOpen ? '🟢' : '🔴', color: settings?.isOpen ? 'text-emerald-600' : 'text-red-600' },
          { label: t.statDelivery, value: settings?.deliveryEnabled ? t.statEnabled : t.statDisabled, icon: '🚚', color: settings?.deliveryEnabled ? 'text-emerald-600' : 'text-stone-500' },
          { label: t.statPickup, value: settings?.pickupEnabled ? t.statEnabled : t.statDisabled, icon: '🏪', color: settings?.pickupEnabled ? 'text-emerald-600' : 'text-stone-500' },
          { label: t.statMinOrder, value: settings ? `${Number(settings.minimumOrderAmount)} SDG` : '—', icon: '💰', color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <span className="text-2xl">{c.icon}</span>
            <p className={`text-base font-bold mt-2 ${c.color}`}>{c.value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Store URL */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <p className="text-sm text-[var(--muted-foreground)] mb-2">{t.storeUrlLabel}</p>
        <div className="flex items-center gap-3 bg-[var(--background)] rounded-xl px-4 py-2.5 border border-[var(--border)]">
          <span className="text-sm text-[var(--foreground)] flex-1 font-mono break-all">{process.env.NEXTAUTH_URL ?? 'https://yourdomain.com'}{storeUrl}</span>
          <a href={storeUrl} target="_blank" rel="noopener" className="text-[var(--primary)] text-sm font-medium whitespace-nowrap hover:underline">{t.openLink}</a>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--primary)] transition-colors group">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{l.icon}</span>
              <div>
                <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{l.title}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{l.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
