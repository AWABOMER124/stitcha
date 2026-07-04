import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { CopyStoreLinkButton } from './copy-store-link-button';

/**
 * Real, DB-backed setup checklist for a newly registered merchant.
 * Renders nothing once every step is complete.
 */
export async function OnboardingChecklist() {
  const session = await auth();
  const merchantId = session?.user?.merchantId;
  if (!merchantId) return null;

  const [merchant, categoryCount, productCount] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { slug: true, logo: true, storefrontSettings: { select: { workingHours: true } } },
    }),
    prisma.category.count({ where: { merchantId } }),
    prisma.product.count({ where: { merchantId } }),
  ]);

  if (!merchant) return null;

  const steps = [
    { label: 'أضف شعار متجرك', done: Boolean(merchant.logo), href: '/dashboard/settings' },
    { label: 'أضف أول تصنيف', done: categoryCount > 0, href: '/dashboard/categories' },
    { label: 'أضف أول منتج', done: productCount > 0, href: '/dashboard/products/new' },
    { label: 'اضبط ساعات العمل والتوصيل', done: Boolean(merchant.storefrontSettings?.workingHours), href: '/dashboard/settings' },
  ];

  const remaining = steps.filter((s) => !s.done);
  const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/store/${merchant.slug}`;

  // All setup steps done — just surface the share link, no checklist noise.
  if (remaining.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">متجرك جاهز ✅</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">شارك رابط متجرك مع عملائك</p>
        </div>
        <CopyStoreLinkButton url={storeUrl} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">أكمل إعداد متجرك</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {remaining.length} {remaining.length === 1 ? 'خطوة متبقية' : 'خطوات متبقية'}
          </p>
        </div>
        <CopyStoreLinkButton url={storeUrl} />
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <a
            key={step.label}
            href={step.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              step.done
                ? 'text-[var(--muted-foreground)]'
                : 'text-[var(--foreground)] hover:bg-[var(--muted)]/40 font-medium'
            }`}
          >
            <span
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs ${
                step.done ? 'bg-emerald-100 text-emerald-700' : 'border border-[var(--border)] text-transparent'
              }`}
            >
              {step.done ? '✓' : ''}
            </span>
            <span className={step.done ? 'line-through' : ''}>{step.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
