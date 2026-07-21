'use client';

import { useState, useTransition } from 'react';
import {
  inviteDistributorUserAction,
  updateDistributorUserRoleAction,
  setDistributorUserOwnerAction,
  setDistributorUserActiveAction,
} from '@/modules/users/actions';
import { useLocale } from '@/lib/i18n/context';

export interface DistributorUserRow {
  id: string;
  userId: string;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

export function DistributorUsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: DistributorUserRow[];
  currentUserId: string;
}) {
  const { dict } = useLocale();
  const t = dict.distributorUsersPage;
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email: '', role: 'DISTRIBUTOR_ADMIN', isOwner: false });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    startTransition(async () => {
      const res = await inviteDistributorUserAction(form);
      if (res.success) {
        const row = res.data as DistributorUserRow;
        setUsers((u) => [row, ...u.filter((x) => x.userId !== row.userId)]);
        setShowForm(false);
        setForm({ email: '', role: 'DISTRIBUTOR_ADMIN', isOwner: false });
        setSuccess(t.invitedMessage.replace('{email}', form.email));
      } else {
        setError(res.error);
      }
    });
  }

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const res = await updateDistributorUserRoleAction(userId, role);
      if (res.success) setUsers((u) => u.map((x) => (x.userId === userId ? { ...x, role } : x)));
    });
  }

  function handleToggleOwner(userId: string, current: boolean) {
    startTransition(async () => {
      const res = await setDistributorUserOwnerAction(userId, !current);
      if (res.success) setUsers((u) => u.map((x) => (x.userId === userId ? { ...x, isOwner: !current } : x)));
    });
  }

  function handleToggleActive(userId: string, current: boolean) {
    startTransition(async () => {
      const res = await setDistributorUserActiveAction(userId, !current);
      if (res.success) setUsers((u) => u.map((x) => (x.userId === userId ? { ...x, isActive: !current } : x)));
    });
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
      >
        {showForm ? t.cancel : t.inviteUser}
      </button>

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{success}</div>
      )}

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{t.inviteTitle}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.emailLabel}</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.roleLabel}</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              >
                {Object.entries(t.roles).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={form.isOwner}
                  onChange={(e) => setForm((f) => ({ ...f, isOwner: e.target.checked }))}
                  className="rounded border-[var(--border)]"
                />
                {t.isOwnerLabel}
              </label>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? t.sending : t.sendInvite}
              </button>
            </div>
          </form>
        </div>
      )}

      {users.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colName}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colContact}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colRole}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colOwner}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colStatus}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => {
                  const isSelf = u.userId === currentUserId;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-[var(--foreground)]">
                        {u.user.name ?? '—'} {isSelf && <span className="text-xs text-[var(--muted-foreground)]">{t.you}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                        <div>{u.user.email}</div>
                        {u.user.phone && <div className="text-xs">{u.user.phone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          defaultValue={u.role}
                          disabled={isPending}
                          onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs disabled:opacity-50"
                        >
                          {Object.entries(t.roles).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleOwner(u.userId, u.isOwner)}
                          disabled={isPending}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full disabled:opacity-50 ${
                            u.isOwner ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {u.isOwner ? t.yes : t.no}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {u.isActive ? t.active : t.suspended}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-left">
                        <button
                          onClick={() => handleToggleActive(u.userId, u.isActive)}
                          disabled={isPending || isSelf}
                          title={isSelf ? t.cannotDeactivateSelf : undefined}
                          className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {u.isActive ? t.deactivate : t.activate}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
