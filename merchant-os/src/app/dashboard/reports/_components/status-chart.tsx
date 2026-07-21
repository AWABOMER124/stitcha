'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { OrdersByStatus } from '@/modules/reports/types';

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: OrdersByStatus }[];
}

export function StatusChart({ data, ordersSuffix }: { data: OrdersByStatus[]; ordersSuffix: string }) {
  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg text-sm">
        <p className="font-bold" style={{ color: d.color }}>{d.label}</p>
        <p className="text-[var(--foreground)] font-mono font-bold">{d.count} {ordersSuffix}</p>
      </div>
    );
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {data.map((d) => (
        <div key={d.status} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
          <span>{d.label}</span>
          <span className="font-mono font-bold text-[var(--foreground)]">({d.count})</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
