import { computeRegistrationStatus, formatCountdown, type RegistrationSettings } from '@wisepath/shared';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function useRegistrationStatus(settings: RegistrationSettings | null | undefined) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return computeRegistrationStatus(settings ?? null, now);
}

export function RegistrationPill({ settings, className }: { settings: RegistrationSettings | null | undefined; className?: string }) {
  const status = useRegistrationStatus(settings);
  const tone = {
    open: 'bg-green-100 text-green-600 ring-green-600/20',
    scheduled: 'bg-amber-100 text-amber-600 ring-amber-600/25',
    ended: 'bg-navy-50 text-navy-700 ring-navy-900/10',
    closed: 'bg-rust-100 text-rust-700 ring-rust-600/20',
  }[status.state];
  const countdown = status.nextChangeAt ? formatCountdown(status.nextChangeAt - Date.now()) : null;
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ring-1', tone, className)}>
      <span className={cn('size-2 rounded-full', status.isOpen ? 'animate-pulse bg-green-600' : 'bg-current opacity-60')} />
      {status.label}
      {countdown && (
        <span className="font-normal opacity-80">· {status.state === 'scheduled' ? 'opens' : 'closes'} in {countdown}</span>
      )}
    </span>
  );
}
