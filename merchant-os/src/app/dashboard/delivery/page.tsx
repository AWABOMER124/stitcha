import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDeliveriesAction } from '@/modules/delivery/actions';
import { DeliveryClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getDeliveriesAction();
  const deliveries = result.success ? (result.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Delivery</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Track active deliveries and assign drivers</p>
      </div>
      <DeliveryClient initialDeliveries={deliveries} />
    </div>
  );
}
