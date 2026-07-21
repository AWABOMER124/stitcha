'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TopProduct } from '@/modules/reports/types';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: TopProduct }[];
  tooltipQuantity?: string;
  tooltipRevenue?: string;
}

function CustomTooltip({ active, payload, tooltipQuantity, tooltipRevenue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm max-w-48">
      <p className="font-bold text-[var(--foreground)] truncate">{d.name}</p>
      <p className="text-[var(--primary)] mt-1">{tooltipQuantity}: <span className="font-mono font-bold">{d.quantity}</span></p>
      <p className="text-emerald-600">{tooltipRevenue}: <span className="font-mono font-bold">{d.revenue.toFixed(0)} SDG</span></p>
    </div>
  );
}

export function ProductsChart({ data, tooltipQuantity, tooltipRevenue }: { data: TopProduct[]; tooltipQuantity: string; tooltipRevenue: string }) {
  const top = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false}
          tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '…' : v} />
        <Tooltip content={<CustomTooltip tooltipQuantity={tooltipQuantity} tooltipRevenue={tooltipRevenue} />} />
        <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
          {top.map((entry, i) => (
            <Cell key={i} fill="#b91c1c" opacity={1 - (i / top.length) * 0.5} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
