import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMerchantByIdAction, updateMerchantStatusAction } from '@/modules/admin/actions';
import { PLATFORM_PERMISSIONS, hasPlatformPermission, requirePlatformPermission } from '@/lib/platform-permissions';
import { MerchantEntitlementsEditor } from '@/components/admin/merchant-entitlements-editor';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';

type MerchantDetail = { id:string;name:string;slug:string;status:string;businessType:string;email:string|null;phone:string|null;createdAt:Date;users:Array<{isOwner:boolean;role:string;user:{id:string;name:string|null;email:string;phone:string|null}}> ;subscription:{status:string;entitlementOverrides:unknown;plan:{name:string;code:string}}|null;storefrontSettings:{isPublished:boolean}|null;_count:{products:number;orders:number;customers:number;branches:number};orders:Array<{id:string;orderNumber:string;status:string;total:number;createdAt:Date}> };

export default async function MerchantDetailPage({params}:{params:Promise<{id:string}>}) {
  const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
  const { id } = await params;
  const result = await getMerchantByIdAction(id);
  if (!result.success) notFound();
  const merchant = result.data as MerchantDetail;
  const canManage = hasPlatformPermission(actor.role, PLATFORM_PERMISSIONS.MERCHANTS_MANAGE);
  const canManageSubscriptions = hasPlatformPermission(actor.role, PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const effectivePlan = canManageSubscriptions ? await getMerchantPlanSnapshot(merchant.id) : null;
  return <div className="space-y-7">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Link href="/admin/merchants" className="text-xs font-bold text-[var(--primary)]">← جميع التجار</Link><h1 className="mt-2 text-2xl font-black">{merchant.name}</h1><p className="text-sm text-[var(--muted-foreground)]">{merchant.slug} · {merchant.businessType}</p></div><span className="w-fit rounded-full bg-[var(--muted)] px-3 py-1.5 text-xs font-black">{merchant.status}</span></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['المنتجات',merchant._count.products],['الطلبات',merchant._count.orders],['العملاء',merchant._count.customers],['الفروع',merchant._count.branches]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><p className="text-xs text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="font-bold">الحساب والاشتراك</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><Info label="البريد" value={merchant.email??'—'}/><Info label="الهاتف" value={merchant.phone??'—'}/><Info label="الباقة" value={merchant.subscription?.plan.name??'الأساسية'}/><Info label="حالة الاشتراك" value={merchant.subscription?.status??'—'}/><Info label="المتجر منشور" value={merchant.storefrontSettings?.isPublished?'نعم':'لا'}/><Info label="تاريخ الانضمام" value={new Date(merchant.createdAt).toLocaleDateString('ar-SD')}/></dl></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="font-bold">مالكو وموظفو المتجر</h2><div className="mt-4 divide-y divide-[var(--border)]">{merchant.users.map(member=><div key={member.user.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-bold">{member.user.name??member.user.email}</p><p className="text-xs text-[var(--muted-foreground)]">{member.user.email}</p></div><span className="text-xs font-semibold">{member.isOwner?'OWNER':member.role}</span></div>)}</div></section></div>
    {canManage&&<section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="font-bold">إجراءات تشغيلية</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">الإيقاف يمنع تشغيل المتجر، ولا يحذف بيانات التاجر.</p><div className="mt-4 flex flex-wrap gap-2">{(['ACTIVE','SUSPENDED','CLOSED'] as const).map(status=><form key={status} action={updateMerchantStatusAction}><input type="hidden" name="merchantId" value={merchant.id}/><input type="hidden" name="status" value={status}/><button disabled={merchant.status===status} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40 ${status==='ACTIVE'?'bg-emerald-600 text-white':status==='SUSPENDED'?'bg-amber-500 text-white':'border border-red-300 text-red-700'}`}>{status}</button></form>)}</div></section>}
    {canManageSubscriptions && effectivePlan && <MerchantEntitlementsEditor merchantId={merchant.id} entitlements={effectivePlan.entitlements} hasOverrides={merchant.subscription?.entitlementOverrides != null}/>}
  </div>;
}

function Info({label,value}:{label:string;value:string}) { return <div><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
