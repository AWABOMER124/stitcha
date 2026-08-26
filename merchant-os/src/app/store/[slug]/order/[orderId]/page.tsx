import { cookies } from 'next/headers';
import * as service from '@/modules/storefront/services/storefront.service';
import Link from 'next/link';
import { LiveOrderStatus } from './_live_status';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export default async function OrderPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].storefrontPublic;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  let order: Awaited<ReturnType<typeof service.getOrderStatus>> | null = null;
  try { order = await service.getOrderStatus(orderId); } catch {}

  return (
    <div dir={dir} className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {order ? (
          <LiveOrderStatus
            slug={slug}
            orderId={orderId}
            initialOrder={{
              orderNumber: order.orderNumber,
              status: order.status,
              createdAt: order.createdAt,
              total: Number(order.total),
              payment: order.payment,
              items: order.items.map((item) => ({ ...item, total: Number(item.total) })),
            }}
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-stone-900">{t.orderReceivedTitle}</h1>
            <Link href={`/store/${slug}`} className="inline-block px-6 py-3 rounded-xl text-white font-bold bg-red-700">
              {t.newOrder}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
