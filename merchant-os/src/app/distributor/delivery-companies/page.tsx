import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { DeliveryCompaniesClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DeliveryCompaniesPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const result = await getDeliveryCompaniesAction();
  const companies = result.success ? (result.data as any[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">شركات التوصيل</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            شركات التوصيل الخارجية التي يمكن تسليمها الطلبات بدل سائقيك
          </p>
        </div>
        <Link
          href="/distributor/delivery-companies/drivers"
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          تعيين مندوبين →
        </Link>
      </div>
      <DeliveryCompaniesClient initialCompanies={companies} />
    </div>
  );
}
