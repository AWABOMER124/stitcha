import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDriversWithAssignmentAction } from '@/modules/delivery-companies/actions';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { DeliveryCompanyDriversClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DeliveryCompanyDriversPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [driversRes, companiesRes] = await Promise.all([
    getDriversWithAssignmentAction(),
    getDeliveryCompaniesAction(),
  ]);

  const drivers = driversRes.success ? (driversRes.data as any[]) : [];
  const companies = companiesRes.success ? (companiesRes.data as any[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/delivery-companies" className="hover:text-[var(--primary)]">شركات التوصيل</Link>
          <span>/</span>
          <span>تعيين مندوبين</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">تعيين مندوبين</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          اربط أي من سائقيك بشركة توصيل معينة إذا كان يمثلها ميدانيًا
        </p>
      </div>
      <DeliveryCompanyDriversClient initialDrivers={drivers} companies={companies} />
    </div>
  );
}
