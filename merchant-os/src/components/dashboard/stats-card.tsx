/**
 * Stats card component for dashboard overview metrics
 */

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "destructive";
}

export function StatsCard({ title, value, icon, trend, variant = "default" }: StatsCardProps) {
  const iconMap: Record<string, string> = {
    "shopping-bag": "📦",
    "banknote": "💰",
    "clock": "⏳",
    "alert-triangle": "⚠️",
    "users": "👥",
    "trending-up": "📈",
  };

  const variantStyles = {
    default: "border-[var(--border)]",
    warning: "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
    destructive: "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
  };

  return (
    <div className={`rounded-xl border p-6 transition-shadow hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">{title}</p>
        <span className="text-2xl">{iconMap[icon] || "📊"}</span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {value}
        </p>
        {trend && (
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            {trend.value}% from yesterday
          </p>
        )}
      </div>
    </div>
  );
}
