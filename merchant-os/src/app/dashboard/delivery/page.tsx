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

  return <DeliveryClient initialDeliveries={deliveries} />;
}
