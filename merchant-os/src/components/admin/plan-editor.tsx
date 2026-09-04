'use client';

import { useActionState } from 'react';
import type { MerchantEntitlements } from '@/modules/merchant-subscriptions/entitlements';
import { PLAN_BOOLEAN_FIELDS, PLAN_LIMIT_FIELDS } from '@/modules/merchant-subscriptions/plan-fields';
import { updateMerchantPlanAction } from '@/modules/merchant-subscriptions/admin-actions';

const limitLabels: Record<(typeof PLAN_LIMIT_FIELDS)[number], string> = {
  maxActiveProducts: 'المنتجات النشطة', maxCategories: 'التصنيفات', maxStaffUsers: 'الموظفون', maxBranches: 'الفروع',
  aiMonthlyCredits: 'رصيد AI القديم', aiStoreGenerationsLifetime: 'توليد متجر مدى الحياة', aiStoreGenerationsMonthly: 'توليد متجر / شهر',
  aiStoreEditsMonthly: 'تعديلات AI / شهر', aiMerchantChatsMonthly: 'محادثات المساعد / شهر',
  aiImageEnhancementsMonthly: 'تحسين الصور / شهر', whatsappAiConversationsMonthly: 'محادثات واتساب AI / شهر',
};
const flagLabels: Record<(typeof PLAN_BOOLEAN_FIELDS)[number], string> = {
  customDomain: 'دومين خاص', removeBranding: 'إزالة علامة وصلة', advancedAnalytics: 'تحليلات متقدمة',
  crmAutomation: 'أتمتة CRM', dataExport: 'تصدير البيانات', apiAccess: 'الوصول إلى API', whatsappAiAgent: 'وكيل واتساب AI',
};

export interface EditablePlan {
  id: string; code: string; name: string; description: string; monthlyPrice: number; currency: string;
  sortOrder: number; isPublic: boolean; isActive: boolean; entitlements: MerchantEntitlements;
}

export function PlanEditor({ plan }: { plan: EditablePlan }) {
  const [state, action, pending] = useActionState(updateMerchantPlanAction, undefined);
  const input = 'mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';
  return (
    <form action={action} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <input type="hidden" name="id" value={plan.id} /><input type="hidden" name="code" value={plan.code} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold text-[var(--primary)]">{plan.code}</p><h2 className="text-xl font-black">{plan.name}</h2></div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={plan.isActive} /> مفعّلة</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isPublic" defaultChecked={plan.isPublic} /> عامة</label>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-sm font-semibold md:col-span-2">اسم الباقة<input className={input} name="name" defaultValue={plan.name} required /></label>
        <label className="text-sm font-semibold">السعر الشهري<input className={input} name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={plan.monthlyPrice} required /></label>
        <label className="text-sm font-semibold">العملة<input className={input} name="currency" maxLength={3} defaultValue={plan.currency} required /></label>
        <label className="text-sm font-semibold md:col-span-3">الوصف<input className={input} name="description" defaultValue={plan.description} /></label>
        <label className="text-sm font-semibold">ترتيب العرض<input className={input} name="sortOrder" type="number" min="0" defaultValue={plan.sortOrder} /></label>
      </div>
      <h3 className="mt-6 font-bold">الحدود <span className="text-xs font-normal text-[var(--muted-foreground)]">(-1 = غير محدود)</span></h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_LIMIT_FIELDS.map((key) => <label key={key} className="text-xs font-semibold">{limitLabels[key]}<input className={input} name={key} type="number" min="-1" defaultValue={plan.entitlements[key]} required /></label>)}
      </div>
      <h3 className="mt-6 font-bold">الميزات</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_BOOLEAN_FIELDS.map((key) => <label key={key} className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm"><input type="checkbox" name={key} defaultChecked={plan.entitlements[key]} /> {flagLabels[key]}</label>)}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button disabled={pending} className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending ? 'جارٍ الحفظ…' : 'حفظ الباقة'}</button>
        {state?.success && <p className="text-sm font-semibold text-emerald-600">تم حفظ {state.data.code} بنجاح.</p>}
        {state && !state.success && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
