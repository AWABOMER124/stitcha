import prisma from '@/lib/db/prisma';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';

export async function getMarketerPortal(userId: string) {
  const account = await prisma.marketerAccount.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      referrals: { include: { referredMerchant: { select: { name: true, slug: true } } }, orderBy: { registeredAt: 'desc' }, take: 100 },
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
  const [totals, recent, acquisitionTotals, acquisitionCommissions] = await Promise.all([
    prisma.storeAffiliateCommission.groupBy({ by: ['affiliateId', 'status', 'currency'], where: { affiliateId: { in: affiliateIds } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.storeAffiliateCommission.findMany({ where: { affiliateId: { in: affiliateIds } }, include: { affiliate: { select: { merchant: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.marketerSubscriptionCommission.groupBy({ by: ['status', 'currency'], where: { marketerAccountId: account.id }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.marketerSubscriptionCommission.findMany({ where: { marketerAccountId: account.id }, include: { referralRecord: { include: { referredMerchant: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  return {
    profile: account.user,
    acquisitionCode: account.acquisitionCode,
    acquisitionReferrals: account.referrals,
    acquisitionTotals: acquisitionTotals.map(item => ({ status: item.status, currency: item.currency, amount: Number(item._sum.amount ?? 0), count: item._count._all })),
    acquisitionCommissions: acquisitionCommissions.map(item => ({ ...item, amount: Number(item.amount), grossAmount: Number(item.grossAmount) })),
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
