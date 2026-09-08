'use client';

import { useState, useTransition } from 'react';
import { createBranchAction, updateBranchAction, deleteBranchAction, setBranchActiveAction, setMainBranchAction } from '@/modules/branches/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email?: string | null;
  lat?: number | null;
  lng?: number | null;
  isMain: boolean;
  isActive: boolean;
}

export function BranchesClient({ initialBranches }: { initialBranches: Branch[] }) {
  const { dict } = useLocale();
  const t = dict.branchesPage;
  const c = dict.crud;
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [branches, setBranches] = useState(initialBranches);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', lat: '', lng: '' });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', address: '', phone: '', email: '', lat: '', lng: '' });
    setError('');
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '', email: b.email ?? '', lat: b.lat?.toString() ?? '', lng: b.lng?.toString() ?? '' });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const payload = {
        name: form.name, address: form.address || undefined, phone: form.phone || undefined, email: form.email || undefined,
        lat: form.lat ? Number(form.lat) : undefined, lng: form.lng ? Number(form.lng) : undefined,
      };
      if (editingId) {
        const res = await updateBranchAction(editingId, payload);
        if (res.success) {
          const updated = res.data as unknown as Branch;
          setBranches((b) => b.map((x) => (x.id === editingId ? { ...x, ...updated } : x)));
          resetForm();
          toast.success('تم حفظ بيانات الفرع');
        } else setError(res.error);
      } else {
        const res = await createBranchAction(payload);
        if (res.success) {
          const created = res.data as unknown as Branch;
          setBranches((b) => [...b, created]);
          resetForm();
          toast.success('تمت إضافة الفرع بنجاح');
        } else setError(res.error);
      }
    });
  }

  async function handleSetMain(id: string) {
    const ok = await confirmDialog({ title: 'تعيين الفرع الرئيسي', message: 'سيصبح هذا الفرع نقطة التشغيل والالتقاط الافتراضية للطلبات الجديدة. هل تريد المتابعة؟', confirmLabel: 'تعيين كرئيسي' });
    if (!ok) return;
    startTransition(async () => {
      const res = await setMainBranchAction(id);
      if (res.success) {
        setBranches((b) => b.map((x) => ({ ...x, isMain: x.id === id })));
        toast.success('تم تحديث الفرع الرئيسي');
      } else toast.error(res.error);
    });
  }

  async function handleToggleActive(b: Branch) {
    const action = b.isActive ? 'إيقاف' : 'تفعيل';
    const ok = await confirmDialog({ title: `${action} الفرع`, message: b.isActive ? 'لن يظهر الفرع للطلبات الجديدة أو التوصيل حتى تعيد تفعيله، مع الاحتفاظ بسجله.' : 'سيعود الفرع متاحاً للطلبات الجديدة والتوصيل.', confirmLabel: action, danger: b.isActive });
    if (!ok) return;
    startTransition(async () => {
      const res = await setBranchActiveAction(b.id, !b.isActive);
      if (res.success) {
        setBranches((rows) => rows.map((row) => row.id === b.id ? { ...row, isActive: !b.isActive } : row));
        toast.success(`تم ${b.isActive ? 'إيقاف' : 'تفعيل'} الفرع`);
      } else toast.error(res.error);
    });
  }

  async function handleDelete(b: Branch) {
    if (b.isMain) { toast.error(t.cannotDeleteMain); return; }
    const ok = await confirmDialog({ message: t.confirmDelete.replace('{name}', b.name), confirmLabel: c.delete, danger: true });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteBranchAction(b.id);
      if (res.success) setBranches((prev) => prev.filter((x) => x.id !== b.id));
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <div className="space-y-5">
      <button
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 transition-colors"
      >
        {showForm ? c.cancel : t.addBranch}
      </button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{editingId ? t.editBranch : t.newBranch}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.name} *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.phone}</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{c.address}</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">خط العرض (للتوصيل)</label>
              <input type="number" step="any" min="-90" max="90" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">خط الطول (للتوصيل)</label>
              <input type="number" step="any" min="-180" max="180" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
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

      {branches.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{b.name}</h3>
                    {b.isMain && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{t.main}</span>}
                    {!b.isActive && <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-full">متوقف</span>}
                  </div>
                  {b.address && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{b.address}</p>}
                  {b.phone && <p className="text-xs text-[var(--muted-foreground)]">{b.phone}</p>}
                  {b.lat != null && b.lng != null && <p className="mt-1 text-xs text-[var(--muted-foreground)]" dir="ltr">{b.lat}, {b.lng}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                <button onClick={() => startEdit(b)} className="text-xs font-medium text-[var(--foreground)] hover:underline">
                  {c.edit}
                </button>
                {!b.isMain && (
                  <button onClick={() => handleSetMain(b.id)} disabled={isPending}
                    className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50">
                    {t.setAsMain}
                  </button>
                )}
                <button onClick={() => handleToggleActive(b)} disabled={isPending}
                  className={`text-xs font-medium hover:underline disabled:opacity-50 ${b.isActive ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {b.isActive ? 'إيقاف' : 'تفعيل'}
                </button>
                <button onClick={() => handleDelete(b)} disabled={isPending}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                  {c.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
