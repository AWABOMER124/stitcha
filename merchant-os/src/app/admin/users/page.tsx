import { getPlatformUsersAction } from '@/modules/admin/actions';

type PlatformUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  createdAt: string | Date;
  emailVerified?: string | Date | null;
};

export default async function AdminUsersPage() {
  const res = await getPlatformUsersAction();
  const users = res.success ? (res.data as PlatformUser[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">مستخدمو المنصة</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          حسابات PLATFORM_OWNER — {users.length} مستخدم
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {users.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-sm text-[var(--muted-foreground)]">لا يوجد مستخدمون</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                {['المستخدم', 'البريد الإلكتروني', 'الدور', 'التحقق', 'تاريخ الإنشاء'].map((h) => (
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
                      <span className="text-xs text-emerald-600 font-medium">✓ موثّق</span>
                    ) : (
                      <span className="text-xs text-amber-600">غير موثّق</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-xs text-[var(--muted-foreground)]">
                    {new Date(u.createdAt).toLocaleDateString('ar-SD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          لإضافة مستخدم جديد للمنصة، قم بإنشاء حساب من صفحة التسجيل ثم قم بتحديث الدور إلى <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-xs">PLATFORM_OWNER</code> مباشرةً في قاعدة البيانات.
        </p>
      </div>
    </div>
  );
}
