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

async function saveApplication(formData: FormData) {
  "use server";
  const { partnerId } = await requireDeliveryPartner();
  const value = (name: string, max = 500) =>
    String(formData.get(name) ?? "")
      .trim()
      .slice(0, max) || null;
  const apiBaseUrl = value("apiBaseUrl", 300);
  const apiSecret = value("apiSecret", 500);
  const intent = value("intent", 30);
  if (intent === 'submit') await requireDeliveryPartner({ verified: true });
  for (const key of ['website', 'appWebsite', 'privacyUrl', 'termsUrl', 'documentationUrl']) {
    const raw = value(key, 300);
    if (raw && !z.url({ protocol: /^https?$/ }).safeParse(raw).success) redirect('/partner/settings?error=validation');
  }
  if (value('supportEmail', 254) && !z.email().safeParse(value('supportEmail', 254)).success) redirect('/partner/settings?error=validation');
  if (apiBaseUrl) {
    try { validatePartnerEndpoint(apiBaseUrl); } catch { redirect('/partner/settings?error=api-origin'); }
  }
  const existing = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true } });
  if (intent === 'submit' && (!value('appName', 120) || !apiBaseUrl || (!apiSecret && !existing.providerConfig?.credentials))) redirect('/partner/settings?error=incomplete');
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
        appStatus: intent === 'submit' && existing.appStatus !== 'PUBLISHED' ? 'SUBMITTED' : existing.appStatus,
      },
    });
    if (apiBaseUrl) {
      await tx.deliveryPartnerProviderConfig.upsert({
        where: { partnerId },
        create: {
          partnerId,
          providerKey: "PARTNER_HTTP_V1",
          apiBaseUrl,
          credentials: apiSecret ? encryptSecret(apiSecret) : null,
          isActive: true,
        },
        update: {
          providerKey: "PARTNER_HTTP_V1",
          apiBaseUrl,
          ...(apiSecret ? { credentials: encryptSecret(apiSecret) } : {}),
          isActive: true,
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
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">تم حفظ بيانات التطبيق بنجاح.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">أكمل اسم التطبيق ومفتاح الربط. رابط API يجب أن يكون HTTPS ومعتمداً من إدارة وصلة قبل استخدامه.</p>}
      <header>
        <p className="mb-2 text-sm font-bold text-[var(--primary)]">مساحة تطوير تطبيق الشحن</p>
        <h1 className="text-2xl font-black">التطبيق والتكامل</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          هذه البيانات هي بطاقة تطبيقك في سوق وصلة، وإعدادات الاتصال بنظام الشحن
          لديك.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-full border px-3 py-2">{({ DRAFT: 'مسودة', SUBMITTED: 'قيد المراجعة', PUBLISHED: 'منشور', REJECTED: 'يحتاج تعديلاً' } as Record<string, string>)[partner.appStatus] ?? partner.appStatus}</span><Link className="rounded-full border px-3 py-2" href="/partner/docs">دليل الربط وAPI</Link><Link className="rounded-full border px-3 py-2" href="/partner/sandbox">متجر الاختبار</Link><Link className="rounded-full border px-3 py-2" href="/partner/security">تأكيد الحساب</Link></div>
      </header>
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
        <Section title="02 — الاتصال بنظام الشحن">
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">أدخل عنوان نظام شركتك ومفتاحه، واترك المفتاح فارغاً عند الحفظ للاحتفاظ بالقيمة السابقة. عنوان الإنتاج يحتاج اعتماد نطاقه من إدارة وصلة. استخدم متجر الاختبار للتجارب المعزولة.</p>
          <Field
            name="apiBaseUrl"
            label="رابط API الأساسي"
            value={partner.providerConfig?.apiBaseUrl}
          />
          <Field
            name="apiSecret"
            label="مفتاح API (يُحفظ مشفراً)"
            type="password"
          />
          <p className="rounded-xl bg-[var(--muted)] p-3 text-xs leading-6">
            الربط الحالي ينشئ الشحنة ويستقبل تحديثات الحالة الموقعة. تنسيق الإلغاء مع الشركة مطلوب قبل الإطلاق. أرسل الحالات إلى
            Webhook وصلة.{" "}
            {webhookUrl ? (
              <>
                رابط الاستقبال:{" "}
                <code dir="ltr" className="block break-all select-all">
                  {webhookUrl}
                </code>
              </>
            ) : (
              "احفظ الرابط أولاً لإنشاء Webhook خاص بك."
            )}
          </p>
        </Section>
        <Section title="03 — بيانات الشركة والدعم">
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
