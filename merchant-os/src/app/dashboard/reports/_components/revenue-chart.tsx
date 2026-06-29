'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import type { DailyRevenue } from '@/modules/reports/types';

export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('ar', { day: '2-digit', month: 'short' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm" dir="rtl">
        <p className="font-bold text-[var(--foreground)] mb-2">{formatDate(label)}</p>
        <p className="text-emerald-600">الإيراد: <span className="font-mono font-bold">{payload[0]?.value?.toFixed(0)} SDG</span></p>
        <p className="text-blue-600">الطلبات: <span className="font-mono font-bold">{payload[1]?.value}</span></p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="orders" orientation="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="revenue" dataKey="revenue" fill="#b91c1c" radius={[4, 4, 0, 0]} opacity={0.85} />
        <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
