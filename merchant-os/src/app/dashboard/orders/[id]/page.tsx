import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getOrderDetailAction } from '@/modules/fulfillment/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { MerchantShipping } from './_shipping';
import { OrderDetailClient } from './_client';
import prisma from '@/lib/db/prisma';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [result, cookieStore] = await Promise.all([getOrderDetailAction(id), cookies()]);

  if (!result.success || !result.data) {
    notFound();
  }

  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: result.data.merchantId }, select: { subscriptionMarket: true, currency: true } });
  const t = dictionaries[locale].orderDetailPage;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        {t.backToOrders}
      </Link>
      <OrderDetailClient key={String(result.data.updatedAt)} order={result.data} country={merchant.subscriptionMarket} currency={merchant.currency} platformDeliveryEnabled={process.env.PLATFORM_DELIVERY_ENABLED === 'true'} />
      <MerchantShipping orderId={id} />
    </div>
  );
}
