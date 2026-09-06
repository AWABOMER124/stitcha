import prisma from '@/lib/db/prisma';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';

export async function getMarketerPortal(userId: string) {
  const account = await prisma.marketerAccount.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      applications: { select: { id: true, type: true, status: true, merchantId: true, createdAt: true, rejectionReason: true, merchant: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 },
      affiliates: {
        include: {
          merchant: { select: { name: true, slug: true } },
          program: { select: { currency: true, minimumPayout: true, holdDays: true, isActive: true } },
          identityVerification: { select: { status: true } },
          payoutProfile: { select: { id: true } },
          _count: { select: { visits: true, attributions: true } },
        },
        orderBy: { createdAt: 'desc' }, take: 100,
      },
    },
  });
  if (!account || !account.isActive) throw new UnauthorizedError('Marketer account is unavailable');
  const affiliateIds = account.affiliates.map(row => row.id);
  const [totals, recent] = await Promise.all([
    prisma.storeAffiliateCommission.groupBy({ by: ['affiliateId', 'status', 'currency'], where: { affiliateId: { in: affiliateIds } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.storeAffiliateCommission.findMany({ where: { affiliateId: { in: affiliateIds } }, include: { affiliate: { select: { merchant: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  return {
    profile: account.user,
    applications: account.applications,
    affiliates: account.affiliates.map(affiliate => ({
      ...affiliate,
      program: { ...affiliate.program, minimumPayout: Number(affiliate.program.minimumPayout) },
      totals: totals.filter(item => item.affiliateId === affiliate.id).map(item => ({ status: item.status, currency: item.currency, amount: Number(item._sum.amount ?? 0), count: item._count._all })),
    })),
    recent: recent.map(item => ({ ...item, amount: Number(item.amount) })),
  };
}

export async function requireMarketerAccount(userId: string) {
  const account = await prisma.marketerAccount.findUnique({ where: { userId }, select: { id: true, isActive: true } });
  if (!account?.isActive) throw new NotFoundError('Marketer account');
  return account;
}
