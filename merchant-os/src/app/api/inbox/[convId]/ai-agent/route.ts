import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  const merchantId = session?.user?.merchantId;
  if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;
  const body = await request.json().catch(() => ({})) as { enabled?: unknown };
  if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled is required' }, { status: 400 });
  const updated = await prisma.conversation.updateMany({
    where: { id: convId, merchantId, channel: 'WHATSAPP' },
    data: { aiAgentPaused: !body.enabled, ...(body.enabled ? { status: 'OPEN' as const } : { status: 'PENDING' as const }) },
  });
  if (updated.count !== 1) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  return NextResponse.json({ aiAgentPaused: !body.enabled });
}
