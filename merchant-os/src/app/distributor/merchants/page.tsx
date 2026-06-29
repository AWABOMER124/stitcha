import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import Link from 'next/link';

const STORE_TYPE_LABELS: Record<string, string> = {
  FOOD_MENU: 'Food Menu',
  ONLINE_STORE: 'Online Store',
  SERVICES: 'Services',
  BOOKING: 'Booking',
  OTHER: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default async function DistributorMerchantsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const merchants = await prisma.merchant.findMany({
    where: { distributorId: session.user.distributorId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      storeType: true,
      status: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true, products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Merchants</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your merchant accounts
          </p>
        </div>
        <Link
          href="/distributor/merchants/new"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
        >
          + Add Merchant
        </Link>
      </div>

      {merchants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-[var(--muted-foreground)]">No merchants yet.</p>
          <Link
            href="/distributor/merchants/new"
            className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Add your first merchant
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Merchant</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Store Type</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Orders</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Products</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {merchants.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--foreground)]">{m.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{m.email ?? m.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {STORE_TYPE_LABELS[m.storeType] ?? m.storeType}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--foreground)]">{m._count.orders}</td>
                  <td className="px-4 py-3 text-right text-[var(--foreground)]">{m._count.products}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/distributor/merchants/${m.id}`}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
