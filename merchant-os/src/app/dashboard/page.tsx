import { getTodayOverviewAction, getOrdersAction } from '@/modules/orders/actions';
import { getLowStockAlertsAction } from '@/modules/inventory/actions';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { DashboardHomeClient } from './_client';

export default async function DashboardPage() {
  const [overviewResult, recentResult, lowStockResult] = await Promise.all([
    getTodayOverviewAction(),
    getOrdersAction({ limit: 5 }),
    getLowStockAlertsAction(),
  ]);

  const overview = overviewResult.success ? overviewResult.data : null;
  const recentOrders = recentResult.success ? (recentResult.data?.data ?? []) : [];
  const lowStockCount = lowStockResult.success ? (lowStockResult.data as unknown[]).length : 0;

  return (
    <DashboardHomeClient
      overview={overview as any}
      recentOrders={recentOrders as any}
      lowStockCount={lowStockCount}
      onboardingChecklist={<OnboardingChecklist />}
    />
  );
}
