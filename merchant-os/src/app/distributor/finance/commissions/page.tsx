import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getCommissionPlansAction } from '@/modules/finance/actions';
import Link from 'next/link';
import { CommissionPlansClient } from './_client';

export default async function CommissionsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const plansRes = await getCommissionPlansAction();
  const plans = plansRes.success ? plansRes.data : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/finance" className="hover:text-[var(--primary)]">المالية</Link>
          <span>/</span>
          <span>خطط العمولات</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">خطط العمولات</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">حدد هياكل العمولة للتجار</p>
      </div>

      <CommissionPlansClient initialPlans={plans as any[]} />
    </div>
  );
}
