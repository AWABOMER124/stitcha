import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { listStoreDrafts } from '@/modules/agent-integration/services/agent-integration.service';

export async function GET() {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const drafts = await listStoreDrafts(session.user.distributorId);
  return NextResponse.json({ drafts });
}
