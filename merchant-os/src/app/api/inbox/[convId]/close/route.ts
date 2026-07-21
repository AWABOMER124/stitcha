import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;
  try {
    const result = await prisma.conversation.updateMany({
      where: { id: convId, merchantId: session.user.merchantId },
      data: { status: 'CLOSED' },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to close conversation' }, { status: 500 });
  }
}
