import Link from "next/link";
import { ArrowLeft, Boxes, CheckCircle2, Code2, MapPin, Truck } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-chrome";
import { LocaleProvider } from "@/lib/i18n/context";
import { getPublicPageContext } from "@/lib/marketing/public-context";

export const metadata = {
  title: "كن شريك وصلة للتوصيل",
  description: "اربط شركة التوصيل بمنصة وصلة واجعل خدماتك متاحة للمتاجر.",
};

export default async function PartnersPage() {
  const ctx = await getPublicPageContext();
  const ar = ctx.locale === "ar";
  const items = ar
    ? [
        [Truck, "وصول لمتاجر جديدة", "اعرض مناطق وأسعار وخدمات شركتك أمام التجار المؤهلين داخل وصلة."],
        [Code2, "ربط تقني منظم", "مفاتيح API وويب هوك موقّع لتبادل الطلبات والحالات وتتبع الشحنات."],
        [Boxes, "تشغيل من بوابة واحدة", "راجع الشحنات، اختبر التكامل، وأدر إعدادات تطبيق التوصيل من بوابتك."],
      ]
    : [
        [Truck, "Reach new stores", "Offer your coverage, pricing and services to eligible Wasla merchants."],
        [Code2, "Structured integration", "API credentials and signed webhooks for orders, statuses and tracking."],
        [Boxes, "One partner portal", "Review shipments, test the integration and manage your delivery app settings."],
      ];
  return (
    <LocaleProvider initialLocale={ctx.locale}>
    <div className="min-h-screen bg-white text-[#07111f]" dir={ar ? "rtl" : "ltr"}>
      <PublicHeader {...ctx} />
      <main>
        <section className="border-b border-slate-200 bg-[#07111f] text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-28">
            <div>
              <span className="inline-flex rounded-full border border-[#13c4a3]/40 bg-[#13c4a3]/10 px-4 py-2 text-sm font-bold text-[#7ce8d2]">{ar ? "شراكات التوصيل" : "Delivery partnerships"}</span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">{ar ? "وسّع أعمال التوصيل مع متاجر وصلة" : "Grow your delivery business with Wasla stores"}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{ar ? "انضم كشريك تشغيل موثوق، اربط نظامك، واستقبل طلبات التوصيل بحالات موحّدة وتجربة واضحة للتاجر." : "Join as a trusted operations partner, connect your system and receive delivery requests through a consistent merchant experience."}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/partner-register" className="inline-flex items-center gap-2 rounded-xl bg-[#13c4a3] px-6 py-3 font-black text-[#07111f]">{ar ? "قدّم طلب الشراكة" : "Apply to partner"}<ArrowLeft className="h-4 w-4 ltr:rotate-180" /></Link>
                <Link href="/login" className="rounded-xl border border-white/25 px-6 py-3 font-bold">{ar ? "دخول الشركاء" : "Partner sign in"}</Link>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-7">
              <p className="text-sm font-bold text-[#7ce8d2]">{ar ? "ما تحتاجه للانضمام" : "What you need"}</p>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
                {[ar ? "بيانات الشركة ونقاط التواصل" : "Company and contact details", ar ? "مناطق التغطية وأسعار الخدمة" : "Coverage areas and service pricing", ar ? "رابط API آمن لاستقبال الطلبات وتحديث حالاتها" : "A secure API endpoint for orders and status updates", ar ? "اتفاق مستوى خدمة وسياسة التحصيل عند الاستلام" : "Service-level and cash-on-delivery policies"].map(item => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#13c4a3]" />{item}</li>)}
              </ul>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {items.map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof MapPin;
              return <article key={String(title)} className="rounded-3xl border border-slate-200 p-7"><ItemIcon className="h-8 w-8 text-[#087d82]" /><h2 className="mt-5 text-xl font-black">{String(title)}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{String(body)}</p></article>;
            })}
          </div>
        </section>
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-5xl px-5 py-16 text-center">
            <h2 className="text-3xl font-black">{ar ? "من التسجيل إلى التشغيل" : "From application to operation"}</h2>
            <div className="mt-9 grid gap-4 text-start sm:grid-cols-4">
              {(ar ? ["1. قدّم بيانات الشركة", "2. مراجعة واعتماد وصلة", "3. اختبر الربط التجريبي", "4. انشر خدمتك للمتاجر"] : ["1. Submit company details", "2. Wasla review and approval", "3. Test the sandbox integration", "4. Publish to merchants"]).map(step => <div key={step} className="rounded-2xl bg-white p-5 font-bold shadow-sm">{step}</div>)}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter locale={ctx.locale} />
    </div>
    </LocaleProvider>
  );
}
