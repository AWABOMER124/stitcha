import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await prisma.merchant.updateMany({
    where: { id, distributorId: session.user.distributorId },
    data: { status },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  return NextResponse.json({ id, status });
}
