import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { handleError } from '@/lib/errors';
import { rejectStoreDraft } from '@/modules/agent-integration/services/agent-integration.service';
import { rejectStoreDraftSchema } from '@/modules/agent-integration/schemas/agent-integration.schemas';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = rejectStoreDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  try {
    const draft = await rejectStoreDraft(id, session.user.distributorId, session.user.id, parsed.data.reason);
    return NextResponse.json({ draft });
  } catch (err) {
    const { error } = handleError(err);
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
}
