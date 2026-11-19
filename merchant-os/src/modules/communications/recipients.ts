import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import type { Audience, Channel, RecipientFilters } from './contracts';

export const MAX_RECIPIENTS = 2000;
export type Recipient = {
  id: string; name: string; businessName: string; entityId: string; merchantId: string | null;
  email: string; phone: string | null; storePath: string; createdAt: string;
  preference: { marketing: boolean; email: boolean; whatsapp: boolean } | null;
};

export function merchantCohort(segment: RecipientFilters['segment']): Prisma.MerchantWhereInput {
  const base: Prisma.MerchantWhereInput = { isActive: true, status: { in: ['PENDING', 'ACTIVE'] } };
  if (segment === 'NOT_ACTIVATED') base.status = 'PENDING';
  if (segment === 'ACTIVE') base.status = 'ACTIVE';
  if (segment === 'UNVERIFIED_IDENTITY') base.OR = [{ identityVerification: { is: null } }, { identityVerification: { is: { status: { not: 'APPROVED' } } } }];
  if (segment === 'NO_PRODUCTS') base.products = { none: {} };
  if (segment === 'NO_ORDERS') base.orders = { none: {} };
  if (segment === 'INCOMPLETE_SETUP') base.OR = [
    { logo: null }, { logo: '' }, { phone: null }, { phone: '' }, { address: null }, { address: '' }, { products: { none: {} } },
  ];
  return base;
}

export function partnerCohort(segment: RecipientFilters['segment']): Prisma.DeliveryPartnerWhereInput {
    const partner: Prisma.DeliveryPartnerWhereInput = { isActive: true, status: { in: ['ACTIVE', 'PENDING'] } };
    if (segment === 'NOT_ACTIVATED') partner.status = 'PENDING';
    if (segment === 'ACTIVE') partner.status = 'ACTIVE';
    if (segment === 'PARTNER_UNPUBLISHED') partner.appStatus = { not: 'PUBLISHED' };
    if (segment === 'INCOMPLETE_SETUP') partner.OR = [{ logo: null }, { providerConfig: { is: null } }, { serviceAreas: { none: {} } }, { pricingRules: { none: {} } }];
  return partner;
}

export function recipientWhere(audience: Audience, filters: RecipientFilters, now = new Date()): Prisma.UserWhereInput {
  const { segment, search, minAgeDays, maxAgeDays, userIds } = filters;
  const and: Prisma.UserWhereInput[] = [];
  if (userIds.length) and.push({ id: { in: userIds } });
  if (minAgeDays || maxAgeDays !== null) and.push({ createdAt: {
    lte: new Date(now.getTime() - minAgeDays * 86400000),
    ...(maxAgeDays !== null ? { gte: new Date(now.getTime() - (maxAgeDays + 1) * 86400000) } : {}),
  } });
  if (segment === 'EMAIL_UNVERIFIED') and.push({ emailVerified: null });
  if (segment === 'PHONE_UNVERIFIED') and.push({ phoneVerifiedAt: null });
  if (search) and.push({ OR: [
    { name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } },
    ...(audience === 'MERCHANT' ? [{ merchantUsers: { some: { isOwner: true, isActive: true, merchant: { name: { contains: search, mode: 'insensitive' as const } } } } }] : []),
    ...(audience === 'PARTNER' ? [{ deliveryPartnerUsers: { some: { isOwner: true, isActive: true, partner: { name: { contains: search, mode: 'insensitive' as const } } } } }] : []),
  ] });
  if (audience === 'MERCHANT') and.push({ role: 'MERCHANT_OWNER', merchantUsers: { some: { isOwner: true, isActive: true, merchant: merchantCohort(segment) } } });
  if (audience === 'MARKETER') {
    if (['NO_PRODUCTS', 'NO_ORDERS', 'PARTNER_UNPUBLISHED'].includes(segment)) throw new Error('هذا الفلتر لا يخص حسابات المسوقين');
    const account: Prisma.MarketerAccountWhereInput = { isActive: true };
    if (segment === 'UNVERIFIED_IDENTITY') account.OR = [{ identityVerification: { is: null } }, { identityVerification: { is: { status: { not: 'APPROVED' } } } }];
    if (segment === 'INCOMPLETE_SETUP') account.OR = [{ bio: null }, { bio: '' }, { payoutProfile: { is: null } }];
    and.push({ role: 'MARKETER', marketerAccount: { is: account } });
    if (segment === 'NOT_ACTIVATED') and.push({ emailVerified: null });
    if (segment === 'ACTIVE') and.push({ emailVerified: { not: null } });
  }
  if (audience === 'PARTNER') {
    if (['NO_PRODUCTS', 'NO_ORDERS', 'UNVERIFIED_IDENTITY'].includes(segment)) throw new Error('هذا الفلتر لا يخص شركات الشحن');
    and.push({ role: 'DELIVERY_PARTNER_OWNER', deliveryPartnerUsers: { some: { isOwner: true, isActive: true, partner: partnerCohort(segment) } } });
  }
  if (audience === 'MERCHANT' && segment === 'PARTNER_UNPUBLISHED') throw new Error('اختر فلترًا خاصًا بالتجار');
  return { AND: and };
}

export async function resolveRecipients(audience: Audience, filters: RecipientFilters, now = new Date()): Promise<Recipient[]> {
  const merchantWhere = merchantCohort(filters.segment);
  const users = await prisma.user.findMany({
    where: recipientWhere(audience, filters, now), take: MAX_RECIPIENTS + 1, orderBy: { id: 'asc' },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      communicationPreferences: { select: { marketing: true, email: true, whatsapp: true } },
      merchantUsers: { where: { isOwner: true, isActive: true, merchant: merchantWhere }, orderBy: { merchantId: 'asc' }, take: 1,
        select: { merchant: { select: { id: true, name: true, slug: true } } } },
      deliveryPartnerUsers: { where: { isOwner: true, isActive: true, partner: partnerCohort(filters.segment) }, orderBy: { partnerId: 'asc' }, take: 1,
        select: { partner: { select: { id: true, name: true } } } },
    },
  });
  if (users.length > MAX_RECIPIENTS) throw new Error(`الحملة تتجاوز ${MAX_RECIPIENTS} حساب. استخدم فلترًا أدق لتقسيمها؛ لم يُحدد جزء من المستلمين تلقائيًا.`);
  return users.map(u => {
    const merchant = audience === 'MERCHANT' ? u.merchantUsers[0]?.merchant : null;
    const partner = audience === 'PARTNER' ? u.deliveryPartnerUsers[0]?.partner : null;
    return { id: u.id, name: u.name || merchant?.name || partner?.name || 'شريك وصلة', businessName: merchant?.name || partner?.name || u.name || 'حسابك',
      entityId: merchant?.id || partner?.id || u.id, merchantId: merchant?.id || null, email: u.email, phone: u.phone,
      storePath: merchant ? `/store/${merchant.slug}` : audience === 'PARTNER' ? '/partner' : '/marketer',
      preference: u.communicationPreferences, createdAt: u.createdAt.toISOString() };
  });
}

export function channelExclusion(recipient: Recipient, channel: Channel, purpose: string): string | null {
  if (purpose === 'MARKETING' && recipient.preference?.marketing === false) return 'أوقف الرسائل التسويقية';
  if (channel === 'EMAIL' && recipient.preference?.email === false) return 'أوقف رسائل الحملات على البريد';
  if (channel === 'WHATSAPP' && recipient.preference?.whatsapp === false) return 'أوقف رسائل الحملات على واتساب';
  if (channel === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) return 'البريد غير مكتمل';
  if (channel === 'WHATSAPP' && !/^\+?[1-9]\d{7,14}$/.test((recipient.phone || '').replace(/[\s()-]/g, ''))) return 'رقم واتساب غير مكتمل';
  return null;
}
