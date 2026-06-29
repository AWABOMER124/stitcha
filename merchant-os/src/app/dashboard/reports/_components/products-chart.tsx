'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TopProduct } from '@/modules/reports/types';

export function ProductsChart({ data }: { data: TopProduct[] }) {
  const top = data.slice(0, 8);
  const maxQty = Math.max(...top.map((d) => d.quantity), 1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as TopProduct;
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm max-w-48" dir="rtl">
        <p className="font-bold text-[var(--foreground)] truncate">{d.name}</p>
        <p className="text-[var(--primary)] mt-1">الكمية: <span className="font-mono font-bold">{d.quantity}</span></p>
        <p className="text-emerald-600">الإيراد: <span className="font-mono font-bold">{d.revenue.toFixed(0)} SDG</span></p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false}
          tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '…' : v} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
          {top.map((entry, i) => (
            <Cell key={i} fill="#b91c1c" opacity={1 - (i / top.length) * 0.5} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
