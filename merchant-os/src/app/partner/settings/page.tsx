import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import { encryptSecret } from "@/lib/crypto/secret";
import { getPublicOrigin } from "@/lib/public-origin";
import { validatePartnerEndpoint } from '@/modules/delivery-partners/services/partner-endpoint';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { PartnerLogoUpload } from '@/components/partner/logo-upload';
import { CopyField } from '@/components/partner/copy-field';
import { PartnerAppCredentials } from '@/components/partner/app-credentials';
import { ArrowLeft, Building2, CheckCircle2, CloudCog, KeyRound, Radio, ShieldCheck, Webhook } from 'lucide-react';

async function saveApplication(formData: FormData) {
  "use server";
  const { partnerId } = await requireDeliveryPartner();
  const value = (name: string, max = 500) =>
    String(formData.get(name) ?? "")
      .trim()
      .slice(0, max) || null;
  const apiBaseUrl = value("apiBaseUrl", 300);
  const apiSecret = value("apiSecret", 500);
  const integrationMode = value('integrationMode', 30) === 'APP_V1' ? 'APP_V1' : 'LEGACY_HTTP';
  const outboundWebhookUrl = value('outboundWebhookUrl', 300);
  const intent = value("intent", 30);
  if (intent === 'submit') await requireDeliveryPartner({ verified: true });
  for (const key of ['website', 'appWebsite', 'privacyUrl', 'termsUrl', 'documentationUrl']) {
    const raw = value(key, 300);
    if (raw && !z.url({ protocol: /^https?$/ }).safeParse(raw).success) redirect('/partner/settings?error=validation');
  }
  if (value('supportEmail', 254) && !z.email().safeParse(value('supportEmail', 254)).success) redirect('/partner/settings?error=validation');
  if (apiBaseUrl) {
    try { validatePartnerEndpoint(apiBaseUrl, null, true); } catch { redirect('/partner/settings?error=api-origin'); }
  }
  if (outboundWebhookUrl) {
    try { validatePartnerEndpoint(outboundWebhookUrl, null, true); } catch { redirect('/partner/settings?error=api-origin'); }
  }
  const existing = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true } });
  const integrationComplete = integrationMode === 'APP_V1'
    ? !!(outboundWebhookUrl && existing.providerConfig?.clientId && existing.providerConfig.clientSecretHash && existing.providerConfig.webhookSigningSecret)
    : !!(apiBaseUrl && (apiSecret || existing.providerConfig?.credentials));
  const proposedEndpoint = integrationMode === 'APP_V1' ? outboundWebhookUrl : apiBaseUrl;
  const previousEndpoint = existing.providerConfig?.integrationMode === 'APP_V1' ? existing.providerConfig.outboundWebhookUrl : existing.providerConfig?.apiBaseUrl;
  const endpointChanged = proposedEndpoint !== previousEndpoint || integrationMode !== (existing.providerConfig?.integrationMode ?? 'LEGACY_HTTP');
  const integrationActive = integrationComplete && (integrationMode === 'LEGACY_HTTP' || (!endpointChanged && existing.providerConfig?.approvedOrigin === (proposedEndpoint ? new URL(proposedEndpoint).origin : null)));
  if (intent === 'submit' && (!value('appName', 120) || !integrationComplete)) redirect('/partner/settings?error=incomplete');
  await prisma.$transaction(async (tx) => {
    await tx.deliveryPartner.update({
      where: { id: partnerId },
      data: {
        description: value("description", 1200),
        website: value("website", 300),
        supportEmail: value("supportEmail", 254),
        appName: value("appName", 120),
        appDescription: value("appDescription", 1500),
        appWebsite: value("appWebsite", 300),
        privacyUrl: value("privacyUrl", 300),
        termsUrl: value("termsUrl", 300),
        documentationUrl: value("documentationUrl", 300),
        // Saving a published application's metadata must not silently unpublish it.
        appStatus: endpointChanged ? (intent === 'submit' ? 'SUBMITTED' : 'DRAFT')
          : intent === 'submit' && existing.appStatus !== 'PUBLISHED' ? 'SUBMITTED' : existing.appStatus,
      },
    });
    if (apiBaseUrl || outboundWebhookUrl || existing.providerConfig) {
      await tx.deliveryPartnerProviderConfig.upsert({
        where: { partnerId },
        create: {
          partnerId,
          providerKey: "PARTNER_HTTP_V1",
          apiBaseUrl,
          credentials: apiSecret ? encryptSecret(apiSecret) : null,
          integrationMode,
          outboundWebhookUrl,
          approvedOrigin: null,
          subscribedEvents: integrationMode === 'APP_V1' ? ['shipment.created', 'shipment.cancelled'] : undefined,
          isActive: integrationActive,
        },
        update: {
          providerKey: "PARTNER_HTTP_V1",
          apiBaseUrl,
          ...(apiSecret ? { credentials: encryptSecret(apiSecret) } : {}),
          integrationMode,
          outboundWebhookUrl,
          ...(endpointChanged ? { approvedOrigin: null } : {}),
          ...(integrationMode === 'APP_V1' ? { subscribedEvents: ['shipment.created', 'shipment.cancelled'] } : {}),
          isActive: integrationActive,
        },
      });
    }
    else await tx.deliveryPartnerProviderConfig.updateMany({ where: { partnerId }, data: { isActive: false } });
  });
  revalidatePath("/partner/settings");
  revalidatePath("/partner");
  redirect('/partner/settings?saved=1');
}

export default async function PartnerSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const { partnerId } = await requireDeliveryPartner();
  const partner = await prisma.deliveryPartner.findUniqueOrThrow({
    where: { id: partnerId },
    include: { providerConfig: true },
  });
  const webhookUrl = partner.providerConfig
    ? `${await getPublicOrigin()}/api/webhooks/delivery-partners/${partner.providerConfig.webhookToken}`
    : null;
  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">تم حفظ بيانات التطبيق بنجاح.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">أكمل اسم التطبيق ومفتاح الربط. رابط API يجب أن يكون HTTPS ومعتمداً من إدارة وصلة قبل استخدامه.</p>}
      <header className="rounded-3xl bg-[#07111f] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="mb-2 text-sm font-bold text-emerald-300">مساحة تطوير تطبيق الشحن</p>
        <h1 className="text-2xl font-black sm:text-3xl">التطبيق والتكامل</h1>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          هذه البيانات هي بطاقة تطبيقك في سوق وصلة، وإعدادات الاتصال بنظام الشحن
          لديك.
        </p></div><span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">{({ DRAFT: 'مسودة', SUBMITTED: 'قيد المراجعة', PUBLISHED: 'منشور', REJECTED: 'يحتاج تعديلاً' } as Record<string, string>)[partner.appStatus] ?? partner.appStatus}</span></div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm"><Link className="rounded-xl border border-white/20 px-3 py-2 font-bold hover:bg-white/10" href="/partner/docs">دليل الربط وAPI</Link><Link className="rounded-xl border border-white/20 px-3 py-2 font-bold hover:bg-white/10" href="/partner/sandbox">متجر الاختبار</Link><Link className="rounded-xl border border-white/20 px-3 py-2 font-bold hover:bg-white/10" href="/partner/security">تأكيد الحساب</Link></div>
      </header>
      <section className="rounded-2xl border bg-white p-5 shadow-sm shadow-slate-200/40">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><CloudCog className="size-5" /></span><div><h2 className="font-black">كيف يعمل الربط الحالي؟</h2><p className="mt-1 text-sm leading-7 text-slate-600">هو ربط مباشر بين وصلة ونظام شركتك: تزودنا شركتك بعنوان API ومفتاح المصادقة، ثم ترسل وصلة طلبات إنشاء وإلغاء الشحنات إلى نظامكم. وفي الاتجاه الآخر تولّد وصلة رابط Webhook خاصاً بكم لإرسال تحديثات حالات الشحن إليه.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr]"><FlowCard icon={Building2} title="نظام شركة الشحن" text="API Base URL + API Secret من فريقكم التقني" /><div className="grid place-items-center text-teal-600"><ArrowLeft className="size-6 rotate-90 md:rotate-0" /></div><FlowCard icon={Webhook} title="منصة وصلة" text="Webhook URL تولده وصلة لاستقبال الحالات" /></div>
      </section>
      <PartnerLogoUpload initialUrl={partner.appIcon} />
      <form action={saveApplication} className="space-y-6">
        <Section title="01 — كيف يظهر تطبيقك للتجار">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="appName" label="اسم التطبيق" value={partner.appName} type="text" />
            <Field
              name="appWebsite"
              label="موقع التطبيق"
              value={partner.appWebsite}
            />
            <Field
              name="supportEmail"
              label="بريد الدعم"
              value={partner.supportEmail}
              type="email"
            />
          </div>
          <Area
            name="appDescription"
            label="وصف الخدمة ومميزاتها"
            value={partner.appDescription}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="privacyUrl"
              label="سياسة الخصوصية"
              value={partner.privacyUrl}
            />
            <Field name="termsUrl" label="الشروط" value={partner.termsUrl} />
            <Field
              name="documentationUrl"
              label="توثيق API"
              value={partner.documentationUrl}
            />
          </div>
        </Section>
        <Section title="02 — هوية التطبيق والمصادقة">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">نمط الربط<select name="integrationMode" defaultValue={partner.providerConfig?.integrationMode ?? 'APP_V1'} className="mt-2 w-full rounded-xl border border-[var(--input)] bg-white px-3 py-3"><option value="APP_V1">تطبيق وصلة الاحترافي (موصى به)</option><option value="LEGACY_HTTP">الربط المباشر القديم</option></select></label><div className="rounded-xl bg-teal-50 p-4 text-sm leading-7 text-teal-950">النمط الاحترافي يعزل كل متجر عبر Installation مستقل، ويستخدم Access Token قصير العمر وWebhook Secret منفصلاً.</div></div>
          <PartnerAppCredentials clientId={partner.providerConfig?.clientId} />
        </Section>
        <Section title="03 — من وصلة إلى نظام شركتك">
          <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-blue-950"><KeyRound className="mt-1 size-5 shrink-0" /><p className="text-sm leading-7"><strong>هذه البيانات تحصل عليها من الفريق التقني لشركتك.</strong> تستخدمها وصلة عند إرسال إنشاء الشحنة، إلغائها والاستعلام التشغيلي. اترك المفتاح فارغاً عند الحفظ للاحتفاظ بالقيمة السابقة.</p></div>
          <Field name="outboundWebhookUrl" label="Webhook شركتك لاستقبال أحداث وصلة (النمط الاحترافي)" value={partner.providerConfig?.outboundWebhookUrl} />
          <p className="text-xs leading-6 text-slate-500">وصلة ترسل إليه أحداث <code dir="ltr">shipment.created</code> و<code dir="ltr">shipment.cancelled</code> موقعة بـWebhook Secret. يجب أن يرد نظامكم بسرعة بكود 2xx.</p>
          <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-black">إعدادات الربط القديم</summary><div className="mt-4 space-y-4">
          <Field
            name="apiBaseUrl"
            label="رابط API الأساسي لنظام الشركة"
            value={partner.providerConfig?.apiBaseUrl}
          />
          <Field
            name="apiSecret"
            label="مفتاح API الصادر من شركتك (يُحفظ مشفراً)"
            type="password"
          />
          </div></details>
          <div className="flex items-start gap-3 rounded-xl border p-4"><ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-700" /><p className="text-sm leading-7 text-slate-600">النطاق يحتاج اعتماد إدارة وصلة، ولا نقبل HTTP أو عناوين الشبكات الداخلية. المفتاح لا يظهر مجدداً بعد حفظه ويُخزن بصورة مشفرة.</p></div>
        </Section>
        <Section title="04 — من نظام شركتك إلى وصلة">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-950"><Radio className="mt-1 size-5 shrink-0" /><p className="text-sm leading-7"><strong>وصلة هي التي تولّد الرابط أدناه.</strong> ضعه في نظام شركتك وأرسل إليه تحديثات الحالات بالتوقيع الموضح في دليل API. هذا ليس Webhook تستقبل عليه شركتك؛ بل Webhook تستقبل عليه وصلة تحديثاتكم.</p></div>
          {webhookUrl ? <CopyField label="Webhook وصلة لاستقبال تحديثات الشحن" value={webhookUrl} /> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">احفظ رابط API الأساسي أولاً، وبعدها ستنشئ وصلة رابط Webhook خاصاً بتطبيقك.</p>}
          <div className="grid gap-3 sm:grid-cols-3"><MiniStatus label="إنشاء الشحنة" ready={!!partner.providerConfig?.isActive} /><MiniStatus label="إلغاء الشحنة" ready={!!partner.providerConfig?.isActive} /><MiniStatus label="عكس الحالات" ready={!!webhookUrl} /></div>
          <Link href="/partner/docs" className="inline-flex items-center gap-2 text-sm font-black text-teal-700">عرض البايلود، التوقيع والحالات المدعومة <ArrowLeft className="size-4" /></Link>
        </Section>
        <Section title="05 — بيانات الشركة والدعم">
          <Area
            name="description"
            label="نبذة عن الشركة"
            value={partner.description}
          />
          <Field name="website" label="موقع الشركة" value={partner.website} />
        </Section>
        <div className="flex flex-wrap gap-3">
          <button
            name="intent"
            value="save"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 font-bold"
          >
            حفظ التغييرات
          </button>
          <button
            name="intent"
            value="submit"
            className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white"
          >
            إرسال للمراجعة والنشر
          </button>
          <span className="self-center text-sm text-[var(--muted-foreground)]">
            الحالة: {partner.appStatus}
          </span>
        </div>
      </form>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-black">{title}</h2>
      {children}
    </section>
  );
}

function FlowCard({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return <div className="rounded-xl border bg-slate-50 p-4"><Icon className="size-5 text-teal-700" /><p className="mt-3 font-black">{title}</p><p className="mt-1 text-xs leading-6 text-slate-600">{text}</p></div>;
}

function MiniStatus({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center gap-2 rounded-xl border p-3 text-sm font-bold"><CheckCircle2 className={`size-4 ${ready ? 'text-emerald-600' : 'text-slate-300'}`} />{label}</div>;
}
function Field({
  name,
  label,
  value,
  type = "url",
}: {
  name: string;
  label: string;
  value?: string | null;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        className="mt-2 w-full rounded-xl border border-[var(--input)] bg-transparent px-3 py-3 outline-none focus:border-[var(--primary)]"
      />
    </label>
  );
}
function Area({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: string | null;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <textarea
        name={name}
        defaultValue={value ?? ""}
        rows={4}
        className="mt-2 w-full rounded-xl border border-[var(--input)] bg-transparent px-3 py-3 outline-none focus:border-[var(--primary)]"
      />
    </label>
  );
}
