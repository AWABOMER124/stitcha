'use client';

import { useState, useTransition } from 'react';
import { createCommissionPlanAction, deleteCommissionPlanAction } from '@/modules/finance/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const TYPE_COLORS: Record<string, string> = {
  PERCENTAGE: 'bg-blue-100 text-blue-700',
  FLAT_FEE: 'bg-purple-100 text-purple-700',
  HYBRID: 'bg-amber-100 text-amber-700',
  SUBSCRIPTION: 'bg-emerald-100 text-emerald-700',
};

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  rate: number | string;
  minFee: number | string;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  _count?: { merchants: number };
}

export function CommissionPlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const { dict } = useLocale();
  const t = dict.distributorCommissionsPage;
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'PERCENTAGE',
    rate: '',
    minFee: '',
    currency: 'SDG',
    isDefault: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createCommissionPlanAction({
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        rate: parseFloat(form.rate) || 0,
        minFee: parseFloat(form.minFee) || 0,
        currency: form.currency,
        isDefault: form.isDefault,
      });
      if (res.success) {
        setPlans((prev) => [...prev, res.data as Plan]);
        setShowForm(false);
        setForm({ name: '', description: '', type: 'PERCENTAGE', rate: '', minFee: '', currency: 'SDG', isDefault: false });
      } else {
        setError(res.error);
      }
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirmDialog({ message: t.confirmDelete, confirmLabel: t.delete, danger: true });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteCommissionPlanAction(id);
      if (res.success) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl border bg-[var(--card)] p-5 relative ${
              plan.isDefault
                ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/20'
                : 'border-[var(--border)]'
            }`}
          >
            {plan.isDefault && (
              <span className="absolute top-3 left-3 text-[10px] font-bold bg-[var(--primary)] text-white px-2 py-0.5 rounded-full">
                {t.default}
              </span>
            )}
            <div className="mb-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[plan.type] ?? 'bg-gray-100 text-gray-600'}`}>
                {t.types[plan.type as keyof typeof t.types] ?? plan.type}
              </span>
            </div>
            <h3 className="font-bold text-[var(--foreground)] text-lg">{plan.name}</h3>
            {plan.description && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{plan.description}</p>
            )}
            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">{t.rateOrFees}</span>
                <span className="font-mono font-bold text-[var(--foreground)]">
                  {Number(plan.rate).toFixed(2)}
                  {plan.type === 'PERCENTAGE' || plan.type === 'HYBRID' ? '%' : ` ${plan.currency}`}
                </span>
              </div>
              {plan.type === 'HYBRID' && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">{t.minFee}</span>
                  <span className="font-mono font-bold text-[var(--foreground)]">
                    {Number(plan.minFee).toFixed(2)} {plan.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">{t.linkedMerchants}</span>
                <span className="font-bold text-[var(--foreground)]">{plan._count?.merchants ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className={`flex-1 text-center text-xs py-1 rounded-full font-medium ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                {plan.isActive ? t.active : t.disabled}
              </span>
              <button
                onClick={() => handleDelete(plan.id)}
                disabled={isPending}
                className="text-xs px-3 py-1 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {t.delete}
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-5 flex flex-col items-center justify-center gap-3 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-all group min-h-[180px]"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center text-2xl group-hover:bg-[var(--primary)]/10 transition-colors">
            +
          </div>
          <span className="text-sm font-medium text-[var(--muted-foreground)] group-hover:text-[var(--primary)]">
            {t.addNew}
          </span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-5">{t.modalTitle}</h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  placeholder={t.namePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.typeLabel}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  {Object.entries(t.types).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    {form.type === 'PERCENTAGE' || form.type === 'HYBRID' ? t.rateLabelPercent : t.rateLabelAmount}
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={form.rate}
                    onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder="0.00"
                  />
                </div>
                {form.type === 'HYBRID' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.minFeeLabel}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.minFee}
                      onChange={(e) => setForm((p) => ({ ...p, minFee: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.descriptionLabel}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
                  placeholder={t.descriptionPlaceholder}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">{t.setDefault}</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? t.saving : t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
