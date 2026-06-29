'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HourlyOrders } from '@/modules/reports/types';

export function HoursChart({ data }: { data: HourlyOrders[] }) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm" dir="rtl">
        <p className="font-bold text-[var(--foreground)]">{label}</p>
        <p className="text-amber-600 font-mono font-bold">{payload[0]?.value} طلب</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false}
          tickFormatter={(v) => v.split(':')[0]} interval={2} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.orders === maxOrders ? '#f59e0b' : '#b91c1c'} opacity={0.6 + (entry.orders / maxOrders) * 0.4} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
