'use client';

import { useState, useTransition } from 'react';
import { updateLoyaltyConfigAction } from '@/modules/crm/actions';

interface LoyaltyConfig {
  isEnabled: boolean;
  pointsPerOrder: number;
  pointsPerSDG: number;
  redemptionThreshold: number;
  redemptionValueSDG: number;
}

export function LoyaltyClient({
  initialConfig,
  leaderboard,
}: {
  initialConfig: LoyaltyConfig | null;
  leaderboard: any[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState<LoyaltyConfig>(
    initialConfig ?? {
      isEnabled: false, pointsPerOrder: 10, pointsPerSDG: 1,
      redemptionThreshold: 100, redemptionValueSDG: 5,
    }
  );

  function set(k: keyof LoyaltyConfig, v: boolean | number) {
    setConfig((p) => ({ ...p, [k]: v }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateLoyaltyConfigAction(config);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--foreground)]">إعدادات البرنامج</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">تفعيل وضبط قواعد كسب النقاط</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.isEnabled}
              onChange={(e) => set('isEnabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-[var(--muted)] rounded-full peer peer-checked:bg-[var(--primary)] transition-colors
              after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full
              after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[-20px]" />
          </label>
        </div>

        <div className={`space-y-5 ${!config.isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">نقاط لكل طلب</label>
              <input type="number" min="1" max="1000"
                value={config.pointsPerOrder}
                onChange={(e) => set('pointsPerOrder', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">نقاط لكل جنيه SDG</label>
              <input type="number" min="0.1" step="0.1"
                value={config.pointsPerSDG}
                onChange={(e) => set('pointsPerSDG', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">حد الاستبدال (نقاط)</label>
              <input type="number" min="10"
                value={config.redemptionThreshold}
                onChange={(e) => set('redemptionThreshold', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">قيمة الاستبدال (SDG)</label>
              <input type="number" min="0.5" step="0.5"
                value={config.redemptionValueSDG}
                onChange={(e) => set('redemptionValueSDG', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
          </div>

          <div className="rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-4 text-sm">
            <p className="font-semibold text-[var(--primary)] mb-1">ملخص البرنامج</p>
            <p className="text-[var(--foreground)]">
              العميل يكسب <strong>{config.pointsPerOrder}</strong> نقطة + <strong>{config.pointsPerSDG}</strong> نقطة/SDG لكل طلب.
              عند بلوغ <strong>{config.redemptionThreshold}</strong> نقطة يحصل على خصم <strong>{config.redemptionValueSDG} SDG</strong>.
            </p>
          </div>
        </div>

        <button type="submit" disabled={isPending}
          className="w-full rounded-lg bg-[var(--primary)] py-3 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
          {isPending ? 'جاري الحفظ...' : saved ? '✓ تم الحفظ' : 'حفظ الإعدادات'}
        </button>
      </form>

      {leaderboard.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-bold text-[var(--foreground)]">🏆 أصحاب أعلى النقاط</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {leaderboard.map((acc: any, i: number) => (
              <div key={acc.id} className="px-5 py-3.5 flex items-center gap-4">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  i === 0 ? 'bg-amber-400 text-white' :
                  i === 1 ? 'bg-stone-300 text-stone-700' :
                  i === 2 ? 'bg-orange-400 text-white' :
                  'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[var(--foreground)]">{acc.customer?.name ?? '—'}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{acc.customer?.phone}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-sm">⭐</span>
                  <span className="font-black text-lg text-[var(--foreground)]">{acc.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
