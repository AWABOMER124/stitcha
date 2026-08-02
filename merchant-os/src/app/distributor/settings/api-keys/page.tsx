import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { listApiKeysAction } from '@/modules/agent-integration/actions';
import { ApiKeysClient, type ApiKeyListItem } from './_client';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const result = await listApiKeysAction();
  const keys = (result.success ? result.data : []) as ApiKeyListItem[];

  return <ApiKeysClient initialKeys={keys} />;
}
