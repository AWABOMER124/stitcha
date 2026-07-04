import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import Link from 'next/link';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { DeliveryCompanySelect, StatusToggle } from '../_row-actions';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default async function DistributorMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const { id } = await params;

  const [merchant, companiesRes] = await Promise.all([
    prisma.merchant.findFirst({
      where: { id, distributorId: session.user.distributorId },
      select: {
        id: true, name: true, slug: true, email: true, phone: true, address: true,
        status: true, storeType: true, businessType: true, preferredDeliveryCompanyId: true,
        createdAt: true,
        branches: {
          select: { id: true, name: true, address: true, phone: true, isMain: true, isActive: true },
          orderBy: { isMain: 'desc' },
        },
        users: {
          select: {
            isOwner: true, isActive: true, role: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    getDeliveryCompaniesAction(),
  ]);

  if (!merchant) notFound();

  const deliveryCompanies = companiesRes.success ? (companiesRes.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/merchants" className="hover:text-[var(--primary)]">Merchants</Link>
          <span>/</span>
          <span>{merchant.name}</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{merchant.name}</h1>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[merchant.status] ?? ''}`}>
              {merchant.status}
            </span>
          </div>
          <StatusToggle merchantId={merchant.id} status={merchant.status} />
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {merchant.email ?? '—'} · {merchant.phone ?? '—'} · /{merchant.slug}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branches */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">🏠 Branches ({merchant.branches.length})</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {merchant.branches.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">No branches</p>
            ) : (
              merchant.branches.map((b) => (
                <div key={b.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{b.name}</p>
                    {b.isMain && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Main</span>}
                    {!b.isActive && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  {b.address && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{b.address}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Users */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">👤 Users ({merchant.users.length})</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {merchant.users.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">No users</p>
            ) : (
              merchant.users.map((mu) => (
                <div key={mu.user.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{mu.user.name ?? mu.user.email}</p>
                    {mu.isOwner && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Owner</span>}
                    {!mu.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{mu.role}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">🚚 Delivery Company</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Default delivery company for this merchant's orders
          </p>
          <DeliveryCompanySelect
            merchantId={merchant.id}
            preferredDeliveryCompanyId={merchant.preferredDeliveryCompanyId}
            deliveryCompanies={deliveryCompanies}
          />
        </div>
      </div>
    </div>
  );
}
