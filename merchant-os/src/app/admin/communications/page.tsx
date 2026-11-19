import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '@/lib/platform-permissions';
import { getCommunicationCenterAction } from '@/modules/communications/actions';
import { CommunicationsCenter } from './communications-center';

export const dynamic = 'force-dynamic';
export default async function CommunicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (!hasPlatformPermission(session.user.role, PLATFORM_PERMISSIONS.COMMUNICATIONS_MANAGE)) redirect('/admin');
  const result = await getCommunicationCenterAction();
  if (!result.success) throw new Error(result.error);
  return <CommunicationsCenter initial={result.data} />;
}
