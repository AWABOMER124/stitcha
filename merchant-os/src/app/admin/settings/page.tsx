import { cookies } from 'next/headers';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].adminSettingsPage;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        <SettingRow label={t.platformName} value="وصلك — Waslak" />
        <SettingRow label={t.defaultCurrency} value="SDG" />
        <SettingRow label={t.timezone} value="Africa/Khartoum (UTC+3)" />
        <SettingRow label={t.systemVersion} value="1.0.0" />
        <SettingRow label={t.environment} value="Production" />
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t.advancedNote} <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs">.env</code>
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
