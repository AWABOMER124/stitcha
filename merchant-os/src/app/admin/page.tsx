import { getPlatformStatsAction, getRecentActivityAction } from '@/modules/admin/actions';
import { AdminHomeClient } from './_client';

export default async function AdminDashboardPage() {
  const [statsRes, activityRes] = await Promise.all([
    getPlatformStatsAction(),
    getRecentActivityAction(),
  ]);

  const stats = statsRes.success ? (statsRes.data as any) : null;
  const activity = activityRes.success ? (activityRes.data as any) : null;

  return <AdminHomeClient stats={stats} activity={activity} />;
}
