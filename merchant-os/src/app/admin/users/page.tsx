import { cookies } from 'next/headers';
import { getPlatformUsersAction } from '@/modules/admin/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

type PlatformUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  createdAt: string | Date;
  emailVerified?: string | Date | null;
};

export default async function AdminUsersPage() {
  const [res, cookieStore] = await Promise.all([getPlatformUsersAction(), cookies()]);
  const users = res.success ? (res.data as PlatformUser[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].adminUsersPage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {t.subtitlePrefix} {users.length}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {users.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-sm text-[var(--muted-foreground)]">{t.empty}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                {[t.colUser, t.colEmail, t.colRole, t.colVerification, t.colCreated].map((h) => (
                  <th key={h} className="py-3 px-5 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[var(--foreground)]">{u.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs text-[var(--muted-foreground)]">{u.email}</td>
                  <td className="py-3.5 px-5">
                    <span className="rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 text-xs font-bold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {u.emailVerified ? (
                      <span className="text-xs text-emerald-600 font-medium">{t.verified}</span>
                    ) : (
                      <span className="text-xs text-amber-600">{t.unverified}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-xs text-[var(--muted-foreground)]">
                    {new Date(u.createdAt).toLocaleDateString(dateLocale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t.addUserNote} <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs">PLATFORM_OWNER</code>
        </p>
      </div>
    </div>
  );
}
