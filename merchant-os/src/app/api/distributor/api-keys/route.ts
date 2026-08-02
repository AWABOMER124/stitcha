import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { issueApiKey, listApiKeys } from '@/modules/agent-integration/services/agent-integration.service';
import { createApiKeySchema } from '@/modules/agent-integration/schemas/agent-integration.schemas';

export async function GET() {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await listApiKeys(session.user.distributorId);
  return NextResponse.json({ keys });
}

/** Returns the raw key exactly once — the caller must copy it now, it can't be retrieved again. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const key = await issueApiKey(session.user.distributorId, parsed.data);
  return NextResponse.json({ key }, { status: 201 });
}
