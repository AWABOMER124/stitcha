'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import { useLocale } from '@/lib/i18n/context';

export interface CrmCustomer {
  id: string;
  name: string;
  phone: string;
  segment: string;
  totalOrders: number;
  totalSpent: number | string;
  lastOrderAt: string | Date | null;
}

export function CustomersClient({ initialCustomers }: { initialCustomers: CrmCustomer[] }) {
  const { dict, locale } = useLocale();
  const t = dict.crmCustomersPage;
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');

  const SEGMENTS = [
    { value: '', label: t.segmentAll },
    { value: 'VIP', label: t.segments.VIP },
    { value: 'REGULAR', label: t.segments.REGULAR },
    { value: 'NEW', label: t.segments.NEW },
    { value: 'INACTIVE', label: t.segments.INACTIVE },
    { value: 'BLOCKED', label: t.segments.BLOCKED },
  ];

  const filtered = initialCustomers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchSegment = !segment || c.segment === segment;
    return matchSearch && matchSegment;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder={t.searchPlaceholder}
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 w-64" />
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((s) => (
            <button key={s.value} onClick={() => setSegment(s.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                segment === s.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 bg-[var(--card)]'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                {[t.colCustomer, t.colSegment, t.colOrders, t.colSpent, t.colLastOrder, t.colAction].map((h, i) => (
                  <th key={i} className="py-3 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((c) => {
                const seg = SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG];
                const segLabel = t.segments[c.segment as keyof typeof t.segments] ?? seg?.label;
                const lastOrder = c.lastOrderAt
                  ? new Date(c.lastOrderAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
                  : '—';
                return (
                  <tr key={c.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-black text-[var(--primary)]">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{c.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${seg?.bg} ${seg?.color}`}>
                        {segLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--foreground)]">{c.totalOrders}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--foreground)]">
                      {Number(c.totalSpent).toFixed(0)} <span className="text-xs font-normal text-[var(--muted-foreground)]">SDG</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)]">{lastOrder}</td>
                    <td className="py-3.5 px-4">
                      <Link href={`/dashboard/crm/customers/${c.id}`}
                        className="text-xs font-medium text-[var(--primary)] hover:underline">
                        {t.view}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
