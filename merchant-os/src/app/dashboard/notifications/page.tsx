import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getNotificationsAction } from '@/modules/notifications/actions';
import { NotificationsClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const { tab } = await searchParams;
  const isUnread = tab === 'unread';

  const result = await getNotificationsAction({ isRead: isUnread ? false : undefined, limit: 50 });
  const notifications = result.success ? result.data.data : [];
  const pagination = result.success ? result.data.pagination : { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Notifications</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Stay updated on orders, stock, and system events</p>
      </div>
      <NotificationsClient
        initialNotifications={notifications as any[]}
        initialPagination={pagination}
        activeTab={isUnread ? 'unread' : 'all'}
      />
    </div>
  );
}
