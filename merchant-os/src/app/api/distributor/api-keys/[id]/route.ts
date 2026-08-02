import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { handleError } from '@/lib/errors';
import { revokeApiKey } from '@/modules/agent-integration/services/agent-integration.service';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await revokeApiKey(id, session.user.distributorId);
    return NextResponse.json({ id, revoked: true });
  } catch (err) {
    const { error } = handleError(err);
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
}
