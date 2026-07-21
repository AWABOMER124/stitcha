'use client';

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import type { DailyRevenue } from '@/modules/reports/types';
import type { Locale } from '@/lib/i18n/translations';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  dateLocale?: string;
  tooltipRevenue?: string;
  tooltipOrders?: string;
}

function formatDate(d: string, dateLocale: string) {
  const date = new Date(d);
  return date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' });
}

function CustomTooltip({ active, payload, label, dateLocale, tooltipRevenue, tooltipOrders }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm">
      <p className="font-bold text-[var(--foreground)] mb-2">{label && dateLocale ? formatDate(label, dateLocale) : ''}</p>
      <p className="text-emerald-600">{tooltipRevenue}: <span className="font-mono font-bold">{payload[0]?.value?.toFixed(0)} SDG</span></p>
      <p className="text-blue-600">{tooltipOrders}: <span className="font-mono font-bold">{payload[1]?.value}</span></p>
    </div>
  );
}

export function RevenueChart({ data, locale, tooltipRevenue, tooltipOrders }: { data: DailyRevenue[]; locale: Locale; tooltipRevenue: string; tooltipOrders: string }) {
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v: string) => formatDate(v, dateLocale)} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="orders" orientation="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip dateLocale={dateLocale} tooltipRevenue={tooltipRevenue} tooltipOrders={tooltipOrders} />} />
        <Bar yAxisId="revenue" dataKey="revenue" fill="#b91c1c" radius={[4, 4, 0, 0]} opacity={0.85} />
        <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
