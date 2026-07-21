import { getPlatformStatsAction, getRecentActivityAction } from '@/modules/admin/actions';
import { AdminHomeClient, type Stats, type Activity } from './_client';

export default async function AdminDashboardPage() {
  const [statsRes, activityRes] = await Promise.all([
    getPlatformStatsAction(),
    getRecentActivityAction(),
  ]);

  const stats = statsRes.success ? (statsRes.data as unknown as Stats) : null;
  const activity = activityRes.success ? (activityRes.data as unknown as Activity) : null;

  return <AdminHomeClient stats={stats} activity={activity} />;
}
