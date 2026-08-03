import prisma from '@/lib/db/prisma';
import { serializePrismaArray } from '@/lib/serialization';

export function findAccountByPhone(phone: string) {
  return prisma.customerAccount.findUnique({ where: { phone } });
}

export function createSubscription(data: {
  customerAccountId: string;
  startsAt: Date;
  endsAt: Date;
  grantedById: string;
  notes?: string;
}) {
  return prisma.customerSubscription.create({
    data: {
      customerAccountId: data.customerAccountId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      grantedById: data.grantedById,
      notes: data.notes,
    },
  });
}

export async function listAll() {
  const subs = await prisma.customerSubscription.findMany({
    include: { customerAccount: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return serializePrismaArray(subs);
}

export function cancelSubscription(id: string) {
  return prisma.customerSubscription.updateMany({
    where: { id, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });
}

/** True if this CustomerAccount has an active, currently-in-window subscription. */
export async function hasActive(customerAccountId: string, now: Date = new Date()): Promise<boolean> {
  const match = await prisma.customerSubscription.findFirst({
    where: { customerAccountId, status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gte: now } },
    select: { id: true },
  });
  return match !== null;
}
