import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { getPaymobSettingsSummary } from '@/modules/paymob-payments/paymob-settings.service';
import { getStripeStatus } from '@/modules/stripe-payments/stripe-payments.service';
import { PaymobSettingsForm } from './paymob-settings-form';

export const dynamic = 'force-dynamic';
export default async function PaymentGatewaySettingsPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);
  const paymob = await getPaymobSettingsSummary(); const stripe = getStripeStatus();
  return <div dir="rtl" className="max-w-3xl space-y-6">
    <header><h1 className="text-2xl font-black">بوابات الدفع</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">البوابة حسب بلد نشاط المتجر: Paymob للسعودية، وStripe لبقية الأسواق.</p></header>
    <section className="rounded-2xl border bg-[var(--card)] p-6"><div className="mb-6 flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-black">Paymob · السعودية · SAR</h2><p className="mt-2 text-sm">صاحب الحساب: {paymob.legalMerchant}</p></div><span className="h-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">{paymob.enabled && paymob.configured ? (paymob.mode === 'LIVE' ? 'تشغيل فعلي' : 'وضع اختبار') : 'بانتظار التفعيل'}</span></div>
      <PaymobSettingsForm settings={paymob}/>
      <div className="mt-7 rounded-xl bg-[var(--muted)] p-4 text-sm"><p className="font-bold">رابط إشعارات الدفع — Processed Callback</p><code dir="ltr" className="mt-2 block break-all">https://wassla-sd.shop/api/paymob/webhook</code><p className="mt-3 leading-7 text-[var(--muted-foreground)]">تأكيد الدفع يتم من إشعار Paymob الموقّع بعد مطابقة العملية. العودة من شاشة الدفع وحدها لا تفعّل الطلب أو الباقة.</p></div>
    </section>
    <section className="rounded-2xl border bg-[var(--card)] p-6"><h2 className="font-black">Stripe · بقية الأسواق</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{stripe.enabled && stripe.configured ? 'الإعدادات الحالية مفعّلة.' : 'الإعدادات الحالية غير مكتملة أو موقوفة.'} يدير هذا الحساب مدفوعات الأسواق غير السعودية.</p></section>
  </div>;
}
