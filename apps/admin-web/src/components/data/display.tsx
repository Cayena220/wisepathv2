/* Shared display components: PageHeader, StatCard, BarList, EmptyState, ErrorState, LinkRow, MatchPill, StatusBadge. */
import { vizSeries } from '@wisepath/shared';
import { AlertTriangle, ArrowUpRight, ChevronRight, Inbox } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { Badge, Card, Skeleton } from '@/components/ui/primitives';
import { cn, errorMessage } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between', className)}>
      <div className="min-w-0 xl:flex-1">
        {eyebrow && <div className="mb-1.5 text-xs font-semibold tracking-wider text-gold-700 uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-navy-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tone = 'navy',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  tone?: 'navy' | 'gold' | 'teal' | 'rust';
  loading?: boolean;
}) {
  const toneClass = {
    navy: 'bg-navy-900 text-white',
    gold: 'bg-gold-100 text-gold-700',
    teal: 'bg-teal-100 text-teal-700',
    rust: 'bg-rust-100 text-rust-600',
  }[tone];
  const body = (
    <Card className={cn('group relative h-full overflow-hidden p-5 transition', to && 'hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-navy-600">{label}</div>
        {Icon && (
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', toneClass)}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      <div className="tabular mt-2 text-[30px] leading-none font-bold tracking-tight text-navy-900">
        {loading ? <Skeleton className="h-8 w-20" /> : value}
      </div>
      {hint && <div className="mt-2 text-xs text-navy-600">{hint}</div>}
      {to && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 opacity-80 transition group-hover:opacity-100">
          View details <ArrowUpRight className="size-3.5" />
        </span>
      )}
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-xl focus-visible:outline-2">
      {body}
    </Link>
  ) : (
    body
  );
}

export interface BarItem {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  to?: string;
  color?: string;
}

/** Horizontal bars; each row is a link (results must be clickable). */
export function BarList({ items, total, emptyText = 'No data yet.' }: { items: BarItem[]; total?: number; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <EmptyState title={emptyText} compact />;
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const share = sum > 0 ? Math.round((item.value / sum) * 100) : 0;
        const row = (
          <div className="group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-gold-50">
            <div className="relative min-w-0 flex-1">
              <div
                className="absolute inset-y-0 left-0 rounded-md opacity-[0.14] transition-all group-hover:opacity-25"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: item.color ?? vizSeries }}
              />
              <div className="relative flex items-center gap-2 py-1 pl-2">
                <span className="truncate text-[13.5px] font-medium text-navy-900">{item.label}</span>
                {item.sublabel && <span className="hidden truncate text-xs text-navy-400 sm:inline">{item.sublabel}</span>}
              </div>
            </div>
            <div className="tabular w-24 shrink-0 text-right text-[13px]">
              <span className="font-semibold text-navy-900">{item.value}</span>
              <span className="ml-1.5 text-navy-400">{share}%</span>
            </div>
            {item.to && <ChevronRight className="size-4 shrink-0 text-navy-400 transition group-hover:translate-x-0.5 group-hover:text-navy-900" />}
          </div>
        );
        return <li key={item.id}>{item.to ? <Link to={item.to}>{row}</Link> : row}</li>;
      })}
    </ul>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  compact,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
      <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 ring-1 ring-gold-500/15">
        <Icon className="size-5" />
      </span>
      <div className="text-[15px] font-semibold text-navy-900">{title}</div>
      {description && <div className="mt-1 max-w-sm text-sm text-navy-600">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, title = 'Could not load this' }: { error: unknown; title?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rust-600/20 bg-rust-100/60 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rust-600" />
      <div>
        <div className="font-semibold text-rust-700">{title}</div>
        <div className="text-rust-700/80">{errorMessage(error)}</div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function MatchPill({ value, className }: { value: number; className?: string }) {
  const tone = value >= 40 ? 'bg-teal-600 text-white' : value >= 30 ? 'bg-teal-100 text-teal-700' : 'bg-navy-50 text-navy-700';
  return <span className={cn('tabular inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold', tone, className)}>{value}%</span>;
}

export function FitBadge({ isFit, score }: { isFit: boolean; score?: number }) {
  return (
    <Badge tone={isFit ? 'green' : 'amber'}>
      {score != null && <span className="tabular font-semibold">{score}%</span>}
      {isFit ? 'Fit' : 'Not yet'}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge tone="green">Active</Badge>;
  if (status === 'archived') return <Badge tone="neutral">Archived</Badge>;
  if (status === 'disabled') return <Badge tone="rust">Disabled</Badge>;
  return <Badge>{status}</Badge>;
}

export function DeptDot({ color, className }: { color?: string; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: color ?? '#8D9BAE' }} />;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-navy-900">{children}</h2>
      {action}
    </div>
  );
}

/** Keyboard-accessible clickable table row. */
export function useRowLink() {
  return (navigateTo: () => void) => ({
    role: 'link' as const,
    tabIndex: 0,
    onClick: navigateTo,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') navigateTo();
    },
    className: 'cursor-pointer hover:bg-gold-50/70 focus-visible:bg-gold-50 focus-visible:outline-none',
  });
}
