import prisma from '@/lib/db/prisma';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { createWorkbook } from '@/modules/exports/excel';

export const runtime = 'nodejs';
export async function GET() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const marketers = await prisma.marketerAccount.findMany({ include: { user: { select: { name: true, email: true, phone: true } }, identityVerification: { select: { status: true } }, _count: { select: { referrals: true, applications: true, commissions: true } } }, orderBy: { createdAt: 'desc' } });
  const buffer = await createWorkbook({ title: 'المسوّقون', merchantName: 'وصلة', columns: [{ header: 'الاسم', key: 'name', width: 26 }, { header: 'الهاتف', key: 'phone', width: 18 }, { header: 'البريد', key: 'email', width: 28 }, { header: 'رمز الإحالة', key: 'code', width: 18 }, { header: 'المدينة', key: 'city', width: 18 }, { header: 'الهوية', key: 'identity', width: 16 }, { header: 'الحالة', key: 'active', width: 14 }, { header: 'إحالات التجار', key: 'referrals' }, { header: 'طلبات المتاجر', key: 'applications' }, { header: 'العمولات', key: 'commissions' }, { header: 'تاريخ الانضمام', key: 'joined', width: 18 }], rows: marketers.map(m => ({ name: m.user.name, phone: m.user.phone, email: m.user.email, code: m.acquisitionCode, city: m.city, identity: m.identityVerification?.status ?? 'DRAFT', active: m.isActive ? 'ACTIVE' : 'INACTIVE', referrals: m._count.referrals, applications: m._count.applications, commissions: m._count.commissions, joined: m.createdAt })) });
  const filename = `wasla-marketers-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
