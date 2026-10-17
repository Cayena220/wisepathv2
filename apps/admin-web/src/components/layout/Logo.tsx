import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-9', className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1F3350" />
      <path d="M32 9 L36.5 27.5 L55 32 L36.5 36.5 L32 55 L27.5 36.5 L9 32 L27.5 27.5 Z" fill="#C2872E" />
      <path d="M32 20 L34.5 29.5 L44 32 L34.5 34.5 L32 44 L29.5 34.5 L20 32 L29.5 29.5 Z" fill="#FFFDF8" />
      <circle cx="32" cy="32" r="3" fill="#1F3350" />
    </svg>
  );
}

export function Logo({ subtitle, className, inverted }: { subtitle?: string; className?: string; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className={cn('text-[15px] font-bold tracking-tight', inverted ? 'text-white' : 'text-navy-900')}>
          Wise<span className={inverted ? 'text-gold-300' : 'text-gold-700'}>Path</span>
        </div>
        {subtitle && <div className={cn('text-[11px] font-medium', inverted ? 'text-white/60' : 'text-navy-600')}>{subtitle}</div>}
      </div>
    </div>
  );
}
