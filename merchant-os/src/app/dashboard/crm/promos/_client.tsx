'use client';

import { useState, useTransition } from 'react';
import { createPromoCodeAction, togglePromoCodeAction, deletePromoCodeAction } from '@/modules/crm/actions';
import { PROMO_TYPE_LABELS } from '@/modules/crm/types';

interface Promo {
  id: string;
  code: string;
  type: string;
  value: number | string;
  minOrderAmount: number | string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | Date | null;
}

export function PromosClient({ initialPromos }: { initialPromos: Promo[] }) {
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '',
    usageLimit: '', isActive: true, expiresAt: '',
  });

  function setF(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })); }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createPromoCodeAction({
        code: form.code,
        type: form.type as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY',
        value: Number(form.value) || 0,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        isActive: form.isActive,
        expiresAt: form.expiresAt || undefined,
      });
      if (res.success) {
        setPromos((p) => [res.data as Promo, ...p]);
        setShowForm(false);
        setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', usageLimit: '', isActive: true, expiresAt: '' });
      } else { setError(res.error); }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      const res = await togglePromoCodeAction(id, !isActive);
      if (res.success) setPromos((p) => p.map((pr) => pr.id === id ? { ...pr, isActive: !isActive } : pr));
    });
  }

  function handleDelete(id: string, code: string) {
    if (!confirm(`حذف كود "${code}"؟`)) return;
    startTransition(async () => {
      const res = await deletePromoCodeAction(id);
      if (res.success) setPromos((p) => p.filter((pr) => pr.id !== id));
    });
  }

  return (
    <div className="space-y-5">
      <button onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors">
        {showForm ? 'إلغاء' : '+ كود جديد'}
      </button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-5">إنشاء كود خصم جديد</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">الكود *</label>
              <input type="text" required value={form.code} onChange={(e) => setF('code', e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">نوع الخصم *</label>
              <select value={form.type} onChange={(e) => setF('type', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30">
                {Object.entries(PROMO_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.type !== 'FREE_DELIVERY' && (
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                  القيمة {form.type === 'PERCENTAGE' ? '(%)' : '(SDG)'} *
                </label>
                <input type="number" required value={form.value} onChange={(e) => setF('value', e.target.value)}
                  min="0" max={form.type === 'PERCENTAGE' ? '100' : undefined}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">الحد الأدنى للطلب (SDG)</label>
              <input type="number" value={form.minOrderAmount} onChange={(e) => setF('minOrderAmount', e.target.value)}
                min="0" placeholder="اختياري"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">حد الاستخدام</label>
              <input type="number" value={form.usageLimit} onChange={(e) => setF('usageLimit', e.target.value)}
                min="1" placeholder="غير محدود"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">تاريخ الانتهاء</label>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => setF('expiresAt', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                {isPending ? 'جاري الحفظ...' : 'إنشاء الكود'}
              </button>
            </div>
          </form>
        </div>
      )}

      {promos.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="font-semibold text-[var(--foreground)]">لا توجد أكواد خصم</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">أنشئ أكواد خصم لجذب العملاء وتحفيز الطلبات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((promo) => {
            const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
            return (
              <div key={promo.id}
                className={`rounded-xl border bg-[var(--card)] p-5 ${!promo.isActive || isExpired ? 'opacity-60' : 'border-[var(--border)]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-black text-lg text-[var(--foreground)] tracking-wider">{promo.code}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {PROMO_TYPE_LABELS[promo.type as keyof typeof PROMO_TYPE_LABELS]}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isExpired ? 'bg-stone-100 text-stone-500' :
                    promo.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {isExpired ? 'منتهي' : promo.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <div className="text-2xl font-black text-[var(--primary)] mb-3">
                  {promo.type === 'FREE_DELIVERY' ? 'توصيل مجاني' :
                   promo.type === 'PERCENTAGE' ? `${promo.value}%` : `${promo.value} SDG`}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] space-y-0.5">
                  <p>الاستخدام: {promo.usageCount}{promo.usageLimit ? `/${promo.usageLimit}` : ''}</p>
                  {promo.minOrderAmount && <p>حد أدنى: {Number(promo.minOrderAmount)} SDG</p>}
                  {promo.expiresAt && (
                    <p>ينتهي: {new Date(promo.expiresAt).toLocaleDateString('ar')}</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-3">
                  {!isExpired && (
                    <button onClick={() => handleToggle(promo.id, promo.isActive)} disabled={isPending}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        promo.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}>
                      {promo.isActive ? 'إيقاف' : 'تفعيل'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(promo.id, promo.code)} disabled={isPending}
                    className="text-xs font-medium text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
