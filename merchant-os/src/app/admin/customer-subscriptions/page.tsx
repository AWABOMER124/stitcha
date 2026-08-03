import { listCustomerSubscriptionsAction } from '@/modules/customer-subscriptions/actions';
import { CustomerSubscriptionsClient, type SubscriptionListItem } from './_client';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerSubscriptionsPage() {
  const result = await listCustomerSubscriptionsAction();
  const subscriptions = (result.success ? result.data : []) as unknown as SubscriptionListItem[];

  return <CustomerSubscriptionsClient initialSubscriptions={subscriptions} />;
}
