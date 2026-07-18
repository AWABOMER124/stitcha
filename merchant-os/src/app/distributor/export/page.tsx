import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { ExportClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  return <ExportClient />;
}
