import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getCustomerAction, getCustomerOrdersAction } from '@/modules/crm/actions';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import Link from 'next/link';
import { CustomerProfileClient } from './_client';

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [customerRes, ordersRes, cookieStore] = await Promise.all([
    getCustomerAction(params.id),
    getCustomerOrdersAction(params.id),
    cookies(),
  ]);

  if (!customerRes.success) notFound();

  const customer = customerRes.data as any;
  const orders = ordersRes.success ? (ordersRes.data as any[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.customerProfilePage;
  const ct = dict.crmCustomersPage;
  const seg = SEGMENT_CONFIG[customer.segment as keyof typeof SEGMENT_CONFIG];
  const segLabel = ct.segments[customer.segment as keyof typeof ct.segments] ?? seg?.label;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
        <span>/</span>
        <Link href="/dashboard/crm/customers" className="hover:text-[var(--primary)]">{ct.title}</Link>
        <span>/</span>
        <span>{customer.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-2xl font-black text-[var(--primary)] mx-auto mb-4">
            {customer.name.charAt(0)}
          </div>
          <h2 className="text-lg font-black text-[var(--foreground)]">{customer.name}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{customer.phone}</p>
          <span className={`mt-2 inline-block text-xs px-3 py-1 rounded-full font-semibold ${seg?.bg} ${seg?.color}`}>
            {segLabel}
          </span>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-5 text-center">
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{customer.totalOrders}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t.ordersUnit}</p>
            </div>
            <div>
              <p className="text-xl font-black text-emerald-600">{Number(customer.totalSpent).toFixed(0)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">SDG</p>
            </div>
          </div>

          {customer.loyaltyAccount && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-600 mb-0.5">{t.loyaltyPoints}</p>
              <p className="text-2xl font-black text-amber-700">{customer.loyaltyAccount.points}</p>
            </div>
          )}

          {customer.email && (
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{customer.email}</p>
          )}
          {customer.address && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)] text-right bg-[var(--muted)]/40 rounded-lg p-2.5 leading-relaxed">
              📍 {customer.address}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <CustomerProfileClient customer={customer} />

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--foreground)]">{t.ordersHistory}</h3>
            </div>
            {orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">{t.noOrders}</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {orders.map((o: any) => (
                  <div key={o.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono font-bold text-[var(--foreground)]">{o.orderNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        o.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                        o.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {o.status === 'DELIVERED' ? t.statusDelivered : o.status === 'CANCELLED' ? t.statusCancelled : t.statusInProgress}
                      </span>
                      <p className="font-mono font-bold text-sm text-[var(--foreground)]">{Number(o.total).toFixed(0)} SDG</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
