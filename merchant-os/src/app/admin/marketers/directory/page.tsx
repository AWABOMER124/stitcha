import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

export const dynamic = 'force-dynamic';

const identityLabel: Record<string, string> = { APPROVED: 'موثقة', SUBMITTED: 'قيد المراجعة', REJECTED: 'مرفوضة', DRAFT: 'لم تُرسل' };

export default async function MarketerDirectoryPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const marketers = await prisma.marketerAccount.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      identityVerification: { select: { status: true, submittedAt: true } },
      _count: { select: { referrals: true, applications: true, commissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return <div className="space-y-6" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[var(--primary)]">نمو المنصة</p><h1 className="mt-1 text-2xl font-black">دليل المسوّقين</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{marketers.length} حساباً · تحقق من الهوية والإحالات والعمولات من ملف واحد.</p></div><div className="flex gap-2"><Link href="/admin/marketers" className="rounded-xl border px-4 py-2 text-sm font-bold">طلبات ومراجعات</Link><a href="/api/admin/exports/marketers" className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">تصدير Excel</a></div></header>
    <section className="overflow-x-auto rounded-2xl border bg-[var(--card)]"><table className="w-full min-w-[900px] text-sm"><thead className="bg-[var(--muted)]"><tr>{['المسوّق','الهاتف والبريد','رمز الإحالة','الهوية','الإحالات','الانضمام','الحالة'].map(x=><th key={x} className="p-3 text-right font-bold">{x}</th>)}</tr></thead><tbody>{marketers.map(m => <tr key={m.id} className="border-t"><td className="p-3"><Link href={`/admin/marketers/${m.id}`} className="font-bold text-[var(--primary)] hover:underline">{m.user.name || 'بدون اسم'}</Link><p className="mt-1 text-xs text-[var(--muted-foreground)]">{m.city || '—'}</p></td><td className="p-3" dir="ltr">{m.user.phone || '—'}<p className="mt-1 text-xs text-[var(--muted-foreground)]">{m.user.email}</p></td><td className="p-3 font-mono text-xs">{m.acquisitionCode}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.identityVerification?.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{identityLabel[m.identityVerification?.status ?? 'DRAFT']}</span></td><td className="p-3 text-center font-bold">{m._count.referrals}</td><td className="p-3 text-xs">{m.createdAt.toLocaleDateString('ar-SD')}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{m.isActive ? 'نشط' : 'موقوف'}</span></td></tr>)}{!marketers.length && <tr><td colSpan={7} className="p-12 text-center text-[var(--muted-foreground)]">لا توجد حسابات مسوّقين بعد.</td></tr>}</tbody></table></section>
  </div>;
}
