import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireMerchantEntitlement } from '@/modules/merchant-subscriptions';

export const CUSTOM_DOMAIN_CNAME_TARGET = process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim().toLowerCase() || 'domains.wassla-sd.shop';

export function normalizeCustomHostname(value: string) {
  const raw = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (raw.includes('/') || raw.includes(':') || raw.startsWith('*.')) throw new ValidationError('أدخل اسم النطاق فقط بدون رابط أو مسار');
  const hostname = domainToASCII(raw);
  const labelsAreValid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname);
  const topLevelDomain = hostname.split('.').at(-1) ?? '';
  if (!hostname || hostname.length > 253 || !hostname.includes('.') || !labelsAreValid || !/[a-z]/.test(topLevelDomain)) {
    throw new ValidationError('اسم النطاق غير صالح');
  }
  if (hostname === 'wassla-sd.shop' || hostname.endsWith('.wassla-sd.shop') || hostname === CUSTOM_DOMAIN_CNAME_TARGET) {
    throw new ValidationError('لا يمكن استخدام نطاقات وصلة كنطاق مخصص');
  }
  return hostname;
}

export function matchesDnsVerification(records: string[][], token: string) {
  const expected = `wasla-verification=${token}`;
  return records.some(parts => parts.join('').trim() === expected);
}

export async function getMerchantDomainDashboard(merchantId: string) {
  const [domain, plan] = await Promise.all([
    prisma.merchantDomain.findUnique({ where: { merchantId } }),
    requireMerchantEntitlement(merchantId, 'customDomain', 'ربط النطاق المخصص متاح في باقة Pro').catch(() => null),
  ]);
  return { domain, available: !!plan?.entitlements.customDomain, cnameTarget: CUSTOM_DOMAIN_CNAME_TARGET };
}

export async function requestMerchantDomain(merchantId: string, rawHostname: string) {
  await requireMerchantEntitlement(merchantId, 'customDomain', 'ربط النطاق المخصص متاح في باقة Pro');
  const hostname = normalizeCustomHostname(rawHostname);
  const verificationToken = randomBytes(24).toString('hex');
  try {
    return await prisma.merchantDomain.upsert({
      where: { merchantId },
      update: { hostname, verificationToken, status: 'PENDING_DNS', dnsVerifiedAt: null, activatedAt: null, reviewedById: null, rejectionReason: null },
      create: { merchantId, hostname, verificationToken },
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictError('هذا النطاق مربوط بمتجر آخر');
    throw error;
  }
}

export async function verifyMerchantDomainDns(merchantId: string, now = new Date()) {
  await requireMerchantEntitlement(merchantId, 'customDomain', 'ربط النطاق المخصص متاح في باقة Pro');
  const domain = await prisma.merchantDomain.findUnique({ where: { merchantId } });
  if (!domain) throw new NotFoundError('Custom domain');
  let records: string[][];
  try {
    records = await resolveTxt(`_wasla-verification.${domain.hostname}`);
  } catch {
    throw new ConflictError('لم يظهر سجل TXT بعد. قد يستغرق انتشار DNS عدة ساعات');
  }
  if (!matchesDnsVerification(records, domain.verificationToken)) throw new ConflictError('قيمة سجل TXT لا تطابق رمز التحقق');
  return prisma.merchantDomain.update({ where: { id: domain.id }, data: { status: 'VERIFIED', dnsVerifiedAt: now, rejectionReason: null } });
}

export async function listMerchantDomainsForAdmin() {
  return prisma.merchantDomain.findMany({
    include: { merchant: { select: { name: true, slug: true, subscription: { select: { status: true, plan: { select: { code: true, entitlements: true } } } } } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200,
  });
}

export async function reviewMerchantDomain(input: { domainId: string; reviewerId: string; decision: 'ACTIVATE' | 'REJECT' | 'DISABLE'; reason?: string }, now = new Date()) {
  if (input.decision === 'REJECT' && !input.reason?.trim()) throw new ValidationError('سبب الرفض مطلوب');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM merchant_domains WHERE id = ${input.domainId} FOR UPDATE`;
    const domain = await tx.merchantDomain.findUnique({ where: { id: input.domainId } });
    if (!domain) throw new NotFoundError('Custom domain');
    if (input.decision === 'ACTIVATE') {
      if (domain.status !== 'VERIFIED') throw new ConflictError('يجب نجاح تحقق DNS قبل التفعيل');
      const plan = await requireMerchantEntitlement(domain.merchantId, 'customDomain', 'التاجر لا يملك باقة Pro فعالة', tx);
      if (!plan.entitlements.customDomain) throw new ConflictError('التاجر لا يملك باقة Pro فعالة');
      return tx.merchantDomain.update({ where: { id: domain.id }, data: { status: 'ACTIVE', activatedAt: now, reviewedById: input.reviewerId, rejectionReason: null } });
    }
    return tx.merchantDomain.update({ where: { id: domain.id }, data: { status: input.decision === 'REJECT' ? 'REJECTED' : 'DISABLED', activatedAt: null, reviewedById: input.reviewerId, rejectionReason: input.decision === 'REJECT' ? input.reason!.trim() : input.reason?.trim() || null } });
  });
}

export async function resolveMerchantByCustomHostname(rawHostname: string) {
  let hostname: string;
  try { hostname = normalizeCustomHostname(rawHostname); } catch { return null; }
  const domain = await prisma.merchantDomain.findFirst({
    where: {
      hostname,
      status: 'ACTIVE',
      merchant: {
        isActive: true,
        status: 'ACTIVE',
        subscription: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] }, plan: { entitlements: { path: ['customDomain'], equals: true } } },
      },
    },
    select: { merchantId: true, merchant: { select: { slug: true } } },
  });
  if (!domain) return null;
  // Reuse the central entitlement evaluator so an expired grace period cannot
  // keep serving a paid custom domain merely because its row still says GRACE_PERIOD.
  const plan = await requireMerchantEntitlement(domain.merchantId, 'customDomain').catch(() => null);
  return plan ? domain.merchant.slug : null;
}
