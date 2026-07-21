import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getAllPromoCodesAction } from '@/modules/crm/actions';
import { PromosClient, type Promo } from './_client';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getAllPromoCodesAction();
  const promos = result.success ? (result.data as Promo[]) : [];

  return <PromosClient initialPromos={promos} />;
}
