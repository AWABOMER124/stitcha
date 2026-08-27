import { cookies } from 'next/headers';
import { getPlatformUsersAction, invitePlatformUserAction, setPlatformUserAccessAction, updatePlatformUserRoleAction } from '@/modules/admin/actions';
import { PLATFORM_STAFF_ROLES } from '@/modules/admin/platform-users.service';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

type PlatformUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  createdAt: string | Date;
  emailVerified?: string | Date | null;
  platformAccessEnabled: boolean;
};

export default async function AdminUsersPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE);
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div><h2 className="font-bold">دعوة عضو لفريق وصلة</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">سيصل إليه رابط آمن لإنشاء كلمة المرور، صالح لمدة 24 ساعة.</p></div>
        <form action={invitePlatformUserAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input name="name" required minLength={2} maxLength={120} placeholder="الاسم" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm" />
          <input name="email" type="email" required placeholder="team@wasla.sd" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm" />
          <select name="role" defaultValue="PLATFORM_SUPPORT" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm">{PLATFORM_STAFF_ROLES.map(role=><option key={role} value={role}>{role.replace('PLATFORM_','')}</option>)}</select>
          <button className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">إرسال الدعوة</button>
        </form>
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
                    <form action={updatePlatformUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id}/>
                      <select name="role" defaultValue={u.role} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs">{PLATFORM_STAFF_ROLES.map(role=><option key={role}>{role}</option>)}</select>
                      <button className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-bold hover:bg-[var(--muted)]">حفظ</button>
                    </form>
                  </td>
                  <td className="py-3.5 px-5">
                    {u.platformAccessEnabled && u.emailVerified ? (
                      <span className="text-xs text-emerald-600 font-medium">{t.verified}</span>
                    ) : !u.platformAccessEnabled ? (
                      <span className="text-xs font-bold text-red-600">موقوف</span>
                    ) : (
                      <span className="text-xs text-amber-600">{t.unverified}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-xs text-[var(--muted-foreground)]">
                    <div className="flex items-center justify-between gap-3"><span>{new Date(u.createdAt).toLocaleDateString(dateLocale)}</span><form action={setPlatformUserAccessAction}><input type="hidden" name="userId" value={u.id}/><input type="hidden" name="enabled" value={u.platformAccessEnabled?'false':'true'}/><button className={`rounded-lg px-2 py-1 text-[10px] font-bold ${u.platformAccessEnabled?'border border-red-200 text-red-600':'bg-emerald-600 text-white'}`}>{u.platformAccessEnabled?'إيقاف':'تفعيل'}</button></form></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted-foreground)]">المالك وحده يدير أعضاء فريق المنصة. لا يمكن إزالة صلاحية آخر مالك.</div>
    </div>
  );
}
