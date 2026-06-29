/**
 * Empty state component for lists with no data
 */
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon = "📭", title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      )}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
