import { cookies } from 'next/headers';
import { getCategoriesAction } from '@/modules/categories/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { ProductForm } from '../_components/product-form';
import { getAuthContext } from '@/lib/permissions';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { AI_FEATURE_KEYS, getMerchantAiUsageSummary } from '@/modules/ai-usage';

export const metadata = { title: 'Add Product — WASLA Commerce OS' };

export default async function NewProductPage() {
  const auth = await getAuthContext();
  const [result, cookieStore, plan, usage] = await Promise.all([getCategoriesAction(), cookies(), getMerchantPlanSnapshot(auth.merchantId), getMerchantAiUsageSummary(auth.merchantId)]);
  const categories = (result.success ? result.data ?? [] : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].productFormPage;
  const imageUsage = usage.find((item) => item.key === AI_FEATURE_KEYS.IMAGE_ENHANCEMENT_MONTHLY);
  const aiImageUpgradeRequired = plan.entitlements.aiImageEnhancementsMonthly === 0 || imageUsage?.remainingUnits === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.addTitle}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t.addSubtitle}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <ProductForm categories={categories} aiImageUpgradeRequired={aiImageUpgradeRequired} aiImageEnabled={!aiImageUpgradeRequired && process.env.AI_IMAGE_ENHANCEMENT_ENABLED === 'true' && !!process.env.OPENAI_API_KEY} />
      </div>
    </div>
  );
}
