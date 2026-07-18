'use client';

import { useState, useTransition } from 'react';
import {
  createDeliveryCompanyAction,
  updateDeliveryCompanyAction,
  deleteDeliveryCompanyAction,
} from '@/modules/delivery-companies/actions';
import { useLocale } from '@/lib/i18n/context';

interface DeliveryCompany {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  isActive: boolean;
  _count?: { drivers: number; deliveries: number; merchants: number };
}

export function DeliveryCompaniesClient({ initialCompanies }: { initialCompanies: DeliveryCompany[] }) {
  const { dict } = useLocale();
  const t = dict.deliveryCompaniesPage;
  const [companies, setCompanies] = useState(initialCompanies);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', contactName: '', phone: '' });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', contactName: '', phone: '' });
    setError('');
  }

  function startEdit(c: DeliveryCompany) {
    setEditingId(c.id);
    setForm({ name: c.name, contactName: c.contactName ?? '', phone: c.phone ?? '' });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const payload = { name: form.name, contactName: form.contactName || undefined, phone: form.phone || undefined };
      if (editingId) {
        const res = await updateDeliveryCompanyAction(editingId, payload);
        if (res.success) {
          setCompanies((c) => c.map((x) => (x.id === editingId ? { ...x, ...(res.data as DeliveryCompany) } : x)));
          resetForm();
        } else setError(res.error);
      } else {
        const res = await createDeliveryCompanyAction(payload);
        if (res.success) {
          setCompanies((c) => [{ ...(res.data as DeliveryCompany), _count: { drivers: 0, deliveries: 0, merchants: 0 } }, ...c]);
          resetForm();
        } else setError(res.error);
      }
    });
  }

  function handleToggleActive(c: DeliveryCompany) {
    startTransition(async () => {
      const res = await updateDeliveryCompanyAction(c.id, { isActive: !c.isActive });
      if (res.success) setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: !c.isActive } : x)));
    });
  }

  function handleDelete(c: DeliveryCompany) {
    if (!confirm(t.confirmDelete.replace('{name}', c.name))) return;
    startTransition(async () => {
      const res = await deleteDeliveryCompanyAction(c.id);
      if (res.success) setCompanies((prev) => prev.filter((x) => x.id !== c.id));
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
        className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
      >
        {showForm ? t.cancel : t.newCompany}
      </button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{editingId ? t.editTitle : t.createTitle}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.nameLabel}</label>
              <input
                type="text" required minLength={2}
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t.namePlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.contactNameLabel}</label>
              <input
                type="text"
                value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.phoneLabel}</label>
              <input
                type="text"
                value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? t.saving : editingId ? t.save : t.create}
              </button>
            </div>
          </form>
        </div>
      )}

      {companies.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🚚</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{c.name}</h3>
                  {c.contactName && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.contactName}</p>}
                  {c.phone && <p className="text-xs text-[var(--muted-foreground)]">{c.phone}</p>}
                </div>
                <button
                  onClick={() => handleToggleActive(c)}
                  disabled={isPending}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium disabled:opacity-50 ${
                    c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {c.isActive ? t.active : t.suspended}
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                {c._count?.drivers ?? 0} {t.driversSuffix} · {c._count?.merchants ?? 0} {t.linkedMerchantsSuffix}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => startEdit(c)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  {t.edit}
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  disabled={isPending}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
