import { listCustomerSubscriptionsAction } from '@/modules/customer-subscriptions/actions';
import { CustomerSubscriptionsClient, type SubscriptionListItem } from './_client';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerSubscriptionsPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const result = await listCustomerSubscriptionsAction();
  const subscriptions = (result.success ? result.data : []) as unknown as SubscriptionListItem[];

  return <CustomerSubscriptionsClient initialSubscriptions={subscriptions} />;
}
