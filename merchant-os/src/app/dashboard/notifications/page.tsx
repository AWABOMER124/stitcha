import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getNotificationsAction } from '@/modules/notifications/actions';
import { NotificationsClient, type Notification } from './_client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notification?:string }>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const { tab,notification } = await searchParams;
  const isUnread = tab === 'unread';

  const result = await getNotificationsAction({ isRead: isUnread ? false : undefined, limit: 50, ...(notification ? {id:notification} : {}) });
  const notifications = result.success ? result.data.data : [];
  const pagination = result.success ? result.data.pagination : { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <NotificationsClient
      initialNotifications={notifications as unknown as Notification[]}
      initialPagination={pagination}
      loadError={result.success?undefined:result.error}
      activeTab={isUnread ? 'unread' : 'all'}
    />
  );
}
