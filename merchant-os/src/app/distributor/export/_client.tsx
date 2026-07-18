'use client';

import { useLocale } from '@/lib/i18n/context';

export function ExportClient() {
  const { dict } = useLocale();
  const t = dict.exportData;

  const exports = [
    { type: 'merchants', label: t.merchants, description: t.merchantsDesc, icon: '🏪' },
    { type: 'drivers', label: t.drivers, description: t.driversDesc, icon: '🏍️' },
    { type: 'orders', label: t.orders, description: t.ordersDesc, icon: '📋' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exports.map((e) => (
          <div key={e.type} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col">
            <span className="text-2xl mb-2">{e.icon}</span>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{e.label}</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 flex-1">{e.description}</p>
            <a
              href={`/api/distributor/export/${e.type}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary)]/90 transition-colors"
            >
              {t.download}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
