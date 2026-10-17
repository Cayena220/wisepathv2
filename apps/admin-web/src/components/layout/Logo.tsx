import { cn } from '@/lib/utils';

/** Graduation cap + open book + path — the WisePath mark. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/brand/wisepath-mark.png" alt="" className={cn('h-10 w-auto select-none', className)} draggable={false} />;
}

/** Full logo with "WISEPATH — Smart Course Recommendation". Designed for light backgrounds. */
export function LogoFull({ className }: { className?: string }) {
  return <img src="/brand/wisepath-logo.png" alt="WisePath — Smart Course Recommendation" className={cn('h-28 w-auto select-none', className)} draggable={false} />;
}

/**
 * Horizontal lockup: mark + WISEPATH lettering (+ optional subtitle).
 * `onDark` sets it on a white tile, because the navy parts of the logo vanish on dark backgrounds.
 */
export function Logo({ subtitle, className, onDark }: { subtitle?: string; className?: string; onDark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', onDark && 'rounded-2xl bg-white px-3.5 py-2.5 shadow-[var(--shadow-lift)]', className)}>
      <LogoMark className="h-11" />
      <div className="flex flex-col gap-1">
        <img src="/brand/wisepath-wordmark.png" alt="WisePath" className="h-[22px] w-auto select-none" draggable={false} />
        {subtitle && <div className="text-[11px] leading-none font-semibold tracking-wide text-navy-600 uppercase">{subtitle}</div>}
      </div>
    </div>
  );
}
