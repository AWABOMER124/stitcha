'use client';

import { useState, useTransition } from 'react';
import { inviteUserAction, updateUserRoleAction, deactivateUserAction } from '@/modules/users/actions';

const ROLE_LABELS: Record<string, string> = {
  MERCHANT_ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  CASHIER: 'Cashier',
  INVENTORY_MANAGER: 'Inventory Manager',
  DELIVERY_STAFF: 'Delivery Staff',
  CUSTOMER_SERVICE: 'Customer Service',
  FINANCE_AGENT: 'Finance Agent',
};

interface StaffRow {
  id: string;
  userId: string;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

export function StaffClient({ initialStaff, currentUserId }: { initialStaff: StaffRow[]; currentUserId: string }) {
  const [staff, setStaff] = useState(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email: '', role: 'CASHIER' });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    startTransition(async () => {
      const res = await inviteUserAction(form);
      if (res.success) {
        setSuccess(`Invited ${form.email} — refresh to see them once they accept`);
        setShowForm(false);
        setForm({ email: '', role: 'CASHIER' });
      } else {
        setError(res.error);
      }
    });
  }

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role);
      if (res.success) setStaff((s) => s.map((x) => (x.userId === userId ? { ...x, role } : x)));
    });
  }

  function handleDeactivate(userId: string) {
    if (!confirm('Remove this staff member\'s access?')) return;
    startTransition(async () => {
      const res = await deactivateUserAction(userId);
      if (res.success) setStaff((s) => s.map((x) => (x.userId === userId ? { ...x, isActive: false } : x)));
    });
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => setShowForm(!showForm)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 transition-colors"
      >
        {showForm ? 'Cancel' : <>+ Invite Staff</>}
      </button>

      {success && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{success}</div>}

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">Invite a team member</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="teammate@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Role</label>
              <select
                value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                {isPending ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-semibold text-[var(--foreground)]">No team members yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Email / Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {staff.map((s) => {
                  const isSelf = s.userId === currentUserId;
                  return (
                    <tr key={s.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-[var(--foreground)]">
                        {s.user.name ?? '—'} {isSelf && <span className="text-xs text-[var(--muted-foreground)]">(you)</span>}
                        {s.isOwner && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Owner</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                        <div>{s.user.email}</div>
                        {s.user.phone && <div className="text-xs">{s.user.phone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.isOwner ? (
                          <span className="text-xs text-[var(--muted-foreground)]">Owner</span>
                        ) : (
                          <select
                            defaultValue={s.role}
                            disabled={isPending}
                            onChange={(e) => handleRoleChange(s.userId, e.target.value)}
                            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {s.isActive ? 'Active' : 'Removed'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {!isSelf && !s.isOwner && s.isActive && (
                          <button onClick={() => handleDeactivate(s.userId)} disabled={isPending}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                            Remove
                          </button>
                        )}
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
