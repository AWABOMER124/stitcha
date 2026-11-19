import prisma from '@/lib/db/prisma';
import { readUnsubscribeToken } from '@/modules/communications/security';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const [{ token }, search] = await Promise.all([params, searchParams]);
  let valid = false;
  try { const id = readUnsubscribeToken(token); valid = Boolean(await prisma.user.findUnique({ where: { id }, select: { id: true } })); } catch { /* Show a generic expired/invalid link. */ }
  async function unsubscribe() {
    'use server';
    const id = readUnsubscribeToken(token);
    await prisma.communicationPreference.upsert({ where: { userId: id }, create: { userId: id, marketing: false }, update: { marketing: false } });
    redirect(`/notifications/unsubscribe/${token}?done=1`);
  }
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border bg-white p-8 text-center"><p className="font-black text-emerald-700">وصلة</p><h1 className="mt-4 text-2xl font-black">{!valid ? 'الرابط غير صالح' : search.done ? 'تم إيقاف الرسائل التسويقية' : 'تفضيلات الرسائل التسويقية'}</h1><p className="mt-4 text-sm leading-7 text-slate-600">{valid ? 'يمكنك إيقاف الحملات التسويقية. ستظل رسائل الأمان والتأكيد والطلبات المهمة متاحة وفق إعدادات حسابك.' : 'افتح إعدادات الرسائل من حسابك لتحديث تفضيلاتك.'}</p>{valid && !search.done && <form action={unsubscribe}><button className="mt-6 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white">إيقاف الرسائل التسويقية</button></form>}</section></main>;
}
