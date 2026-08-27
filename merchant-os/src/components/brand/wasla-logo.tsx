import { brand } from '@/config/brand.config';

export function WaslaMark({ className = 'h-9 w-9' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" role="img" aria-label={brand.displayName}>
    <defs><linearGradient id="wasla-mark-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6"/><stop offset=".56" stopColor="#13C4A3"/><stop offset="1" stopColor="#08A9B8"/></linearGradient></defs>
    <rect width="48" height="48" rx="12" fill="url(#wasla-mark-bg)"/>
    <path d="M9.5 13.5 17.2 34 24 19l7.2 15L38.5 13.5" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9.5" cy="13.5" r="3" fill="white"/><circle cx="38.5" cy="13.5" r="3" fill="white"/><circle cx="31.2" cy="34" r="3" fill="white"/>
  </svg>;
}

export function WaslaLogo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <div className="flex items-center gap-3"><WaslaMark/><div className={compact ? 'hidden sm:block' : ''}><div className={`flex items-center gap-2 text-base font-black tracking-wide ${inverse?'text-white':'text-[var(--foreground)]'}`}><span>وصلة</span><span className={inverse?'text-white/50':'text-[var(--muted-foreground)]'}>|</span><span>WASLA</span></div><div className={`text-[9px] font-semibold tracking-wide ${inverse?'text-slate-300':'text-[var(--muted-foreground)]'}`}>تجارتك... متصلة بكل طريق</div></div></div>;
}
