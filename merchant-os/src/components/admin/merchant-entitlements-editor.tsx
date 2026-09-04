'use client';

import { useActionState } from 'react';
import type { MerchantEntitlements } from '@/modules/merchant-subscriptions/entitlements';
import { PLAN_BOOLEAN_FIELDS, PLAN_LIMIT_FIELDS } from '@/modules/merchant-subscriptions/plan-fields';
import { updateMerchantEntitlementOverridesAction } from '@/modules/merchant-subscriptions/admin-actions';

const limitLabels: Partial<Record<keyof MerchantEntitlements, string>> = {
  maxActiveProducts: 'المنتجات', maxCategories: 'التصنيفات', maxStaffUsers: 'الموظفون', maxBranches: 'الفروع',
  aiMonthlyCredits: 'رصيد AI القديم', aiStoreGenerationsLifetime: 'توليد المتجر مدى الحياة', aiStoreGenerationsMonthly: 'توليد المتجر شهرياً',
  aiStoreEditsMonthly: 'تعديلات المتجر AI', aiMerchantChatsMonthly: 'محادثات المساعد', aiImageEnhancementsMonthly: 'تحسين الصور', whatsappAiConversationsMonthly: 'ردود واتساب AI',
};
const flagLabels: Partial<Record<keyof MerchantEntitlements, string>> = {
  customDomain: 'دومين خاص', removeBranding: 'إزالة علامة وصلة', advancedAnalytics: 'تحليلات متقدمة', crmAutomation: 'أتمتة CRM',
  dataExport: 'تصدير البيانات', apiAccess: 'API', whatsappAiAgent: 'وكيل واتساب AI',
};

export function MerchantEntitlementsEditor({ merchantId, entitlements, hasOverrides }: {
  merchantId: string;
  entitlements: MerchantEntitlements;
  hasOverrides: boolean;
}) {
  const [state, action, pending] = useActionState(updateMerchantEntitlementOverridesAction, undefined);
  const inputClass = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm';
  return <form action={action} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
    <input type="hidden" name="merchantId" value={merchantId}/>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-bold">استحقاقات مخصصة للتاجر</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">القيم هنا تتجاوز الباقة لهذا المتجر فقط. استخدمها للعقود الخاصة والاستثناءات.</p></div>
      {hasOverrides && <button name="mode" value="clear" disabled={pending} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800">إعادة ضبط إلى الباقة</button>}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {PLAN_LIMIT_FIELDS.map(key => <label key={key} className="text-xs font-semibold">{limitLabels[key]}<input className={inputClass} name={key} type="number" min="-1" defaultValue={entitlements[key]} required/></label>)}
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {PLAN_BOOLEAN_FIELDS.map(key => <label key={key} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-sm"><input type="checkbox" name={key} defaultChecked={entitlements[key]}/>{flagLabels[key]}</label>)}
    </div>
    <div className="mt-5 flex items-center gap-3"><button disabled={pending} className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending ? 'جارٍ الحفظ…' : 'حفظ التخصيص'}</button>{state?.success && <span className="text-sm font-semibold text-emerald-700">تم الحفظ.</span>}{state && !state.success && <span className="text-sm font-semibold text-red-700">{state.error}</span>}</div>
  </form>;
}
