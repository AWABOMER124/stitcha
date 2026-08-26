import { brand } from '@/config/brand.config';

export function WaslaMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" role="img" aria-label={brand.displayName}>
    <rect width="48" height="48" rx="12" fill="var(--primary)"/>
    <path d="M11 15v10c0 7 5 12 12 12s12-5 12-12V15M11 22h24M17 15v10c0 4 2 6 6 6s6-2 6-6V15" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="15" r="2.6" fill="white"/><circle cx="35" cy="15" r="2.6" fill="white"/><circle cx="23" cy="37" r="2.6" fill="white"/>
  </svg>;
}

export function WaslaLogo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><WaslaMark/><div className={compact ? 'hidden sm:block' : ''}><div className="text-sm font-bold tracking-wide text-[var(--foreground)]">{brand.displayName}</div><div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{brand.descriptor}</div></div></div>;
}
