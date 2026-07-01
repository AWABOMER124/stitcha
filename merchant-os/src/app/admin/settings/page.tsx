export default function AdminSettingsPage() {
  return (
    <div dir="rtl" className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">إعدادات المنصة</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">إعدادات عامة لمنصة وصلك</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        <SettingRow label="اسم المنصة" value="وصلك — Waslak" />
        <SettingRow label="العملة الافتراضية" value="SDG (جنيه سوداني)" />
        <SettingRow label="المنطقة الزمنية" value="Africa/Khartoum (UTC+3)" />
        <SettingRow label="إصدار النظام" value="1.0.0" />
        <SettingRow label="البيئة" value="Production" />
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          الإعدادات المتقدمة تُدار عبر متغيرات البيئة في <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs">.env</code>
        </p>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
