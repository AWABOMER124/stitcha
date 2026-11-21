import Link from 'next/link';
import { MerchantCodPanel } from '@/modules/delivery-partners/components/cod-panel';
import prisma from '@/lib/db/prisma';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { ReturnForm } from './_return-form';
export async function MerchantShipping({ orderId }: { orderId: string }) {
 const context = await getAuthContext(); requirePermission(context, 'orders:read');
 const row = await prisma.platformShipment.findFirst({ where: { orderId, order: { merchantId: context.merchantId } }, include: { partner: { select: { providerConfig: { select: { market: true } } } }, returnShipment: true, order: { select: { status: true } } } });
 if (!row) return null;
 const base = '/dashboard/orders/' + orderId;
 return <section className="space-y-4 rounded-2xl border p-5" dir="rtl"><h2 className="text-lg font-black">بوليصة الشحن والرجيع</h2><Link target="_blank" href={base + '/label'} className="inline-block rounded-xl border px-4 py-3 font-bold">{row.providerReference ? 'عرض وطباعة بوليصة الشحن' : 'عرض وطباعة طلب الشحن'}</Link>{!row.providerReference && <p className="text-sm text-amber-700">بانتظار إصدار مرجع شركة الشحن. اختيار الشركة ينشئ طلب شحن، ويصدر مرجع البوليصة بعد قبولها في نظام الشركة.</p>}
 {row.returnShipment ? <div className="space-y-2"><p>الرجيع: {row.returnShipment.status} · {row.returnShipment.trackingCode}</p><Link target="_blank" href={base + '/return/label'} className="inline-block rounded-xl border px-4 py-3 font-bold">عرض وطباعة {row.returnShipment.providerReference ? 'بوليصة الرجيع' : 'طلب الرجيع'}</Link></div> : row.status === 'DELIVERED' && row.order.status === 'DELIVERED' && row.providerReference ? <ReturnForm orderId={orderId} country={row.partner.providerConfig?.market} /> : <p className="text-sm text-slate-500">إنشاء الرجيع متاح بعد تسليم الطلب فقط.</p>}
 {row.feePayer === 'MERCHANT' && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800">رسوم الشحن على المتجر: {Number(row.fee).toFixed(2)} {row.currency} · رسوم التحصيل: {Number(row.collectionFee).toFixed(2)} {row.currency}. لا تضاف تلقائيًا إلى فاتورة العميل.</p>}
 <MerchantCodPanel shipmentId={row.id}/>
 </section>;
}
