import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDeliveryZonesAction } from '@/modules/finance/actions';
import Link from 'next/link';
import { PriceListsClient } from './_client';

export default async function PriceListsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const zonesRes = await getDeliveryZonesAction();
  const zones = zonesRes.success ? zonesRes.data : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/finance" className="hover:text-[var(--primary)]">المالية</Link>
          <span>/</span>
          <span>قوائم الأسعار</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">قوائم الأسعار والتوصيل</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">حدد رسوم التوصيل لكل منطقة — Last Mile Pricing</p>
      </div>

      <PriceListsClient initialZones={zones as any[]} />
    </div>
  );
}
