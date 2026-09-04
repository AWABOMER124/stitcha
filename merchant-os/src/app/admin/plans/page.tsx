import { PlanEditor } from '@/components/admin/plan-editor';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { listAdminMerchantPlans } from '@/modules/merchant-subscriptions/admin-plan.service';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const plans = await listAdminMerchantPlans();
  return (
    <main className="space-y-6">
      <header><h1 className="text-2xl font-black">إدارة الباقات والأسعار</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">تحكم مركزي في الأسعار وحدود المتاجر وخدمات الذكاء الاصطناعي. التغييرات تطبق فوراً على صلاحيات الباقة.</p></header>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تعطيل باقة لا يلغي اشتراكات التجار الحالية، لكنه يمنع الطلبات الجديدة. راجع الحدود قبل الحفظ.</div>
      <section className="space-y-5">{plans.map((plan) => <PlanEditor key={plan.id} plan={plan} />)}</section>
    </main>
  );
}
