'use client';

import { useState, useTransition } from 'react';
import { createCustomerAction, updateCustomerAction } from '@/modules/customers/actions';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  segment: string;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
}

const SEGMENT_LABEL: Record<string, string> = {
  NEW: 'New', REGULAR: 'Regular', VIP: 'VIP', INACTIVE: 'Inactive', BLOCKED: 'Blocked',
};
const SEGMENT_CLASS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  REGULAR: 'bg-emerald-100 text-emerald-700',
  VIP: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-stone-100 text-stone-500',
  BLOCKED: 'bg-red-100 text-red-700',
};

export function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [search, setSearch] = useState('');

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', phone: '', email: '', notes: '' });
    setError('');
  }

  function startEdit(c: Customer) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? '', notes: '' });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const payload = { name: form.name, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined };
      if (editingId) {
        const res = await updateCustomerAction(editingId, payload);
        if (res.success) {
          const updated = res.data as unknown as Customer;
          setCustomers((c) => c.map((x) => (x.id === editingId ? { ...x, ...updated } : x)));
          resetForm();
        } else setError(res.error);
      } else {
        const res = await createCustomerAction(payload);
        if (res.success) {
          const created = res.data as unknown as Customer;
          setCustomers((c) => [{ ...created, totalOrders: 0, totalSpent: 0, segment: 'NEW', isBlocked: false }, ...c]);
          resetForm();
        } else setError(res.error);
      }
    });
  }

  const filtered = customers.filter(
    (c) => !search || c.name.includes(search) || c.phone.includes(search) || (c.email ?? '').includes(search),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 transition-colors"
        >
          {showForm ? 'Cancel' : <>+ Add Customer</>}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{editingId ? 'Edit customer' : 'New customer'}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Phone *</label>
              <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Notes</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                {isPending ? 'Saving...' : editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold text-[var(--foreground)]">No customers yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Customers are also added automatically when they place an order</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Phone / Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">Segment</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">Orders</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">Total Spent</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[var(--foreground)]">{c.name}</td>
                    <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-xs">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${SEGMENT_CLASS[c.segment] ?? ''}`}>
                        {SEGMENT_LABEL[c.segment] ?? c.segment}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-[var(--foreground)]">{c.totalOrders}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-[var(--foreground)]">
                      {Number(c.totalSpent).toLocaleString()} SDG
                    </td>
                    <td className="px-5 py-3.5 text-left">
                      <button onClick={() => startEdit(c)} className="text-xs font-medium text-[var(--primary)] hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
