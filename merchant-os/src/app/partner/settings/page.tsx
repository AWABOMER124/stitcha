import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireDeliveryPartner } from "@/lib/auth/delivery-partner";
import { encryptSecret } from "@/lib/crypto/secret";
import { getPublicOrigin } from "@/lib/public-origin";

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
  await prisma.$transaction(async (tx) => {
    await tx.deliveryPartner.update({
      where: { id: partnerId },
      data: {
        description: value("description", 1200),
        website: value("website", 300),
        supportEmail: value("supportEmail", 254),
        appName: value("appName", 120),
        appDescription: value("appDescription", 1500),
        appIcon: value("appIcon", 500),
        appWebsite: value("appWebsite", 300),
        privacyUrl: value("privacyUrl", 300),
        termsUrl: value("termsUrl", 300),
        documentationUrl: value("documentationUrl", 300),
        ...(intent === "submit" ? { appStatus: "SUBMITTED" } : {}),
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
  });
  revalidatePath("/partner/settings");
  revalidatePath("/partner");
}

export default async function PartnerSettingsPage() {
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
      <header>
        <h1 className="text-2xl font-black">التطبيق والتكامل</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          هذه البيانات هي بطاقة تطبيقك في سوق وصلة، وإعدادات الاتصال بنظام الشحن
          لديك.
        </p>
      </header>
      <form action={saveApplication} className="space-y-6">
        <Section title="بطاقة التطبيق">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="appName" label="اسم التطبيق" value={partner.appName} />
            <Field
              name="appIcon"
              label="رابط شعار التطبيق"
              value={partner.appIcon}
            />
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
        <Section title="ربط نظام الشحن">
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
            يجب أن يدعم نظامك إنشاء الشحنة وإلغائها، ويرسل تحديثات الحالة إلى
            Webhook وصلة.{" "}
            {webhookUrl ? (
              <>
                رابط الاستقبال:{" "}
                <code dir="ltr" className="select-all">
                  {webhookUrl}
                </code>
              </>
            ) : (
              "احفظ الرابط أولاً لإنشاء Webhook خاص بك."
            )}
          </p>
        </Section>
        <Section title="بيانات الشركة">
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
            حفظ كمسودة
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
