import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDistributorSettingsAction } from '@/modules/distributor-settings/actions';
import { SettingsClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DistributorSettingsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const result = await getDistributorSettingsAction();
  const settings = result.success ? (result.data as any) : null;

  return <SettingsClient initialSettings={settings} />;
}
