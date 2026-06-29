import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getAllPromoCodesAction } from '@/modules/crm/actions';
import { PromosClient } from './_client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getAllPromoCodesAction();
  const promos = result.success ? (result.data as any[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
          <span>/</span>
          <span>أكواد الخصم</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">أكواد الخصم</h1>
      </div>
      <PromosClient initialPromos={promos} />
    </div>
  );
}
