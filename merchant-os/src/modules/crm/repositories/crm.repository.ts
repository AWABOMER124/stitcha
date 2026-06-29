import prisma from '@/lib/db/prisma';
import type { CustomerSegment } from '@prisma/client';
import type { UpdateCustomerInput, CreatePromoCodeInput, UpdateLoyaltyConfigInput } from '../schemas/crm.schemas';

// ── Customers ─────────────────────────────────────────────────────────────────

export async function findAllCustomers(merchantId: string, segment?: CustomerSegment) {
  return prisma.customer.findMany({
    where: { merchantId, ...(segment && { segment }) },
    include: { loyaltyAccount: { select: { points: true } } },
    orderBy: [{ totalOrders: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findCustomerById(merchantId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, merchantId },
    include: {
      loyaltyAccount: {
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
      },
    },
  });
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  return prisma.customer.update({ where: { id }, data });
}

export async function getCustomerStats(merchantId: string) {
  const [total, bySegment, revenue] = await Promise.all([
    prisma.customer.count({ where: { merchantId } }),
    prisma.customer.groupBy({
      by: ['segment'],
      where: { merchantId },
      _count: { id: true },
    }),
    prisma.customer.aggregate({
      where: { merchantId },
      _sum: { totalSpent: true },
    }),
  ]);

  const seg = Object.fromEntries(bySegment.map((s) => [s.segment, s._count.id]));
  return {
    totalCustomers: total,
    newCustomers: seg.NEW ?? 0,
    regularCustomers: seg.REGULAR ?? 0,
    vipCustomers: seg.VIP ?? 0,
    inactiveCustomers: seg.INACTIVE ?? 0,
    blockedCustomers: seg.BLOCKED ?? 0,
    totalRevenue: Number(revenue._sum.totalSpent ?? 0),
  };
}

export async function getOrdersForCustomer(merchantId: string, customerId: string) {
  return prisma.order.findMany({
    where: { merchantId, customerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
  });
}

// ── Promo Codes ───────────────────────────────────────────────────────────────

export async function findAllPromoCodes(merchantId: string) {
  return prisma.promoCode.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPromoByCode(merchantId: string, code: string) {
  return prisma.promoCode.findUnique({
    where: { merchantId_code: { merchantId, code: code.toUpperCase() } },
  });
}

export async function createPromoCode(merchantId: string, data: CreatePromoCodeInput) {
  return prisma.promoCode.create({
    data: {
      ...data,
      merchantId,
      code: data.code.toUpperCase(),
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
}

export async function togglePromoCode(id: string, isActive: boolean) {
  return prisma.promoCode.update({ where: { id }, data: { isActive } });
}

export async function deletePromoCode(id: string) {
  return prisma.promoCode.delete({ where: { id } });
}

export async function validatePromoCode(merchantId: string, code: string, orderAmount: number) {
  const promo = await findPromoByCode(merchantId, code);
  if (!promo || !promo.isActive) return { valid: false, error: 'كود الخصم غير صالح' };

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return { valid: false, error: 'الكود لم يبدأ بعد' };
  if (promo.expiresAt && promo.expiresAt < now) return { valid: false, error: 'الكود منتهي الصلاحية' };
  if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return { valid: false, error: 'استُنفد الكود' };
  if (promo.minOrderAmount && orderAmount < Number(promo.minOrderAmount)) {
    return { valid: false, error: `الحد الأدنى للطلب ${promo.minOrderAmount} SDG` };
  }

  let discount = 0;
  if (promo.type === 'PERCENTAGE') discount = (orderAmount * Number(promo.value)) / 100;
  else if (promo.type === 'FIXED_AMOUNT') discount = Number(promo.value);

  if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));

  return { valid: true, discount, promo };
}

// ── Loyalty ───────────────────────────────────────────────────────────────────

export async function getLoyaltyConfig(merchantId: string) {
  return prisma.loyaltyConfig.findUnique({ where: { merchantId } });
}

export async function upsertLoyaltyConfig(merchantId: string, data: UpdateLoyaltyConfigInput) {
  return prisma.loyaltyConfig.upsert({
    where: { merchantId },
    create: { merchantId, ...data },
    update: data,
  });
}

export async function addLoyaltyPoints(customerId: string, merchantId: string, points: number, orderId?: string) {
  const account = await prisma.loyaltyAccount.upsert({
    where: { customerId },
    create: { customerId, merchantId, points },
    update: { points: { increment: points } },
  });

  await prisma.loyaltyTransaction.create({
    data: {
      loyaltyAccountId: account.id,
      orderId,
      points,
      type: 'EARN',
      description: `كسب ${points} نقطة`,
    },
  });

  return account;
}

export async function getLoyaltyLeaderboard(merchantId: string) {
  return prisma.loyaltyAccount.findMany({
    where: { merchantId },
    include: { customer: { select: { name: true, phone: true, segment: true } } },
    orderBy: { points: 'desc' },
    take: 20,
  });
}
