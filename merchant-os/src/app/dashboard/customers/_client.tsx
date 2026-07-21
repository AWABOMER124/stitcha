'use client';

import { useState, useTransition } from 'react';
import { createCustomerAction, updateCustomerAction } from '@/modules/customers/actions';
import { useLocale } from '@/lib/i18n/context';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  segment: string;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
}

const SEGMENT_CLASS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  REGULAR: 'bg-emerald-100 text-emerald-700',
  VIP: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-stone-100 text-stone-500',
  BLOCKED: 'bg-red-100 text-red-700',
};

export function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const { dict } = useLocale();
  const t = dict.customersPage;
  const c = dict.crud;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 transition-colors"
        >
          {showForm ? c.cancel : t.addCustomer}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{editingId ? t.editCustomer : t.newCustomer}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.name} *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.phone} *</label>
              <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.email}</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.notes}</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                {isPending ? c.saving : editingId ? c.save : c.create}
              </button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colName}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colContact}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colSegment}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colOrders}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colTotalSpent}</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-[var(--foreground)]">{cust.name}</td>
                    <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                      <div>{cust.phone}</div>
                      {cust.email && <div className="text-xs">{cust.email}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${SEGMENT_CLASS[cust.segment] ?? ''}`}>
                        {t.segments[cust.segment as keyof typeof t.segments] ?? cust.segment}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-[var(--foreground)]">{cust.totalOrders}</td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-[var(--foreground)]">
                      {Number(cust.totalSpent).toLocaleString()} SDG
                    </td>
                    <td className="px-5 py-3.5 text-left">
                      <button onClick={() => startEdit(cust)} className="text-xs font-medium text-[var(--primary)] hover:underline">
                        {dict.crud.edit}
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
    </div>
  );
}
