import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db/prisma';

export default async function StorefrontPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.user.merchantId },
    include: { storefrontSettings: true },
  });

  const settings = merchant?.storefrontSettings;
  const theme = (settings?.theme ?? {}) as Record<string, string>;
  const storeUrl = merchant ? `/store/${merchant.slug}` : '#';

  const links = [
    { href: '/dashboard/storefront/customize', icon: '🎨', title: 'تخصيص الهوية', desc: 'الألوان، اللوقو، البانر، ساعات العمل' },
    { href: '/dashboard/storefront/ai', icon: '🤖', title: 'مولّد AI', desc: 'أنشئ محتوى متجرك بالذكاء الاصطناعي' },
    { href: '/dashboard/products', icon: '📦', title: 'إدارة المنتجات', desc: 'أضف وعدّل منتجاتك والفئات' },
    { href: '/dashboard/inbox', icon: '💬', title: 'صندوق الوارد', desc: 'رسائل وتواصل العملاء' },
  ];

  return (
    <div dir="rtl" className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">المتجر الإلكتروني</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">إدارة واجهة متجرك للعملاء</p>
        </div>
        <a href={storeUrl} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <span>🔗</span> عرض المتجر
        </a>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'حالة المتجر', value: settings?.isOpen ? 'مفتوح' : 'مغلق', icon: settings?.isOpen ? '🟢' : '🔴', color: settings?.isOpen ? 'text-emerald-600' : 'text-red-600' },
          { label: 'التوصيل', value: settings?.deliveryEnabled ? 'مفعّل' : 'معطّل', icon: '🚚', color: settings?.deliveryEnabled ? 'text-emerald-600' : 'text-stone-500' },
          { label: 'الاستلام', value: settings?.pickupEnabled ? 'مفعّل' : 'معطّل', icon: '🏪', color: settings?.pickupEnabled ? 'text-emerald-600' : 'text-stone-500' },
          { label: 'الحد الأدنى', value: settings ? `${Number(settings.minimumOrderAmount)} SDG` : '—', icon: '💰', color: 'text-amber-600' },
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
        <p className="text-sm text-[var(--muted-foreground)] mb-2">رابط متجرك</p>
        <div className="flex items-center gap-3 bg-[var(--background)] rounded-xl px-4 py-2.5 border border-[var(--border)]">
          <span className="text-sm text-[var(--foreground)] flex-1 font-mono break-all">{process.env.NEXTAUTH_URL ?? 'https://yourdomain.com'}{storeUrl}</span>
          <a href={storeUrl} target="_blank" rel="noopener" className="text-[var(--primary)] text-sm font-medium whitespace-nowrap hover:underline">فتح ↗</a>
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
