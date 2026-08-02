import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { listStoreDraftsAction } from '@/modules/agent-integration/actions';
import { StoreDraftsClient, type StoreDraftListItem } from './_client';

export const dynamic = 'force-dynamic';

export default async function StoreDraftsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const result = await listStoreDraftsAction();
  const drafts = (result.success ? result.data : []) as unknown as StoreDraftListItem[];

  return <StoreDraftsClient initialDrafts={drafts} />;
}
