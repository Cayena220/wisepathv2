/*
 * Chart primitives for the analytics views.
 * Specs (dataviz method): thin marks (≤ 24px) with a 4px rounded data end and a square baseline,
 * hairline solid grid, values in text ink (never the series color), one hue for a single series,
 * an ordinal light→dark ramp for ordered steps, hover/focus tooltips, and every mark clickable.
 */
import { vizCategorical, vizChrome, vizOrdinal, vizSeries } from '@wisepath/shared';
import { ChevronRight, Table2, BarChart3 } from 'lucide-react';
import * as React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

// ---------------------------------------------------------------- hover tooltip

interface TipContent {
  value: string;
  label: string;
  detail?: string;
}

/** One tooltip per chart: value leads, label follows. Works on hover and keyboard focus. */
function useTip() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tip, setTip] = React.useState<(TipContent & { x: number; y: number; w: number }) | null>(null);
  const bind = (content: TipContent) => ({
    onPointerMove: (e: React.PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (box) setTip({ ...content, x: e.clientX - box.left, y: e.clientY - box.top, w: box.width });
    },
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent) => {
      const box = ref.current?.getBoundingClientRect();
      const el = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (box) setTip({ ...content, x: el.left - box.left + el.width / 2, y: el.top - box.top, w: box.width });
    },
    onBlur: () => setTip(null),
  });
  const node = tip ? (
    <div
      role="presentation"
      className="pointer-events-none absolute z-20 min-w-28 rounded-lg border bg-white px-3 py-2 text-xs shadow-[var(--shadow-lift)]"
      style={{ left: Math.min(Math.max(tip.x, 70), tip.w - 70), top: tip.y - 10, transform: 'translate(-50%, -100%)' }}
    >
      <div className="tabular text-[15px] font-semibold text-navy-900">{tip.value}</div>
      <div className="text-navy-600">{tip.label}</div>
      {tip.detail && <div className="mt-0.5 text-navy-400">{tip.detail}</div>}
    </div>
  ) : null;
  return { ref, bind, node };
}

// ---------------------------------------------------------------- card with chart / table toggle

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  description,
  table,
  action,
  footnote,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  table?: TableView;
  action?: React.ReactNode;
  footnote?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [mode, setMode] = React.useState<'chart' | 'table'>('chart');
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {table && (
            <div className="inline-flex rounded-lg border bg-white p-0.5" role="group" aria-label="View as">
              {(['chart', 'table'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cn('rounded-md p-1.5 text-navy-400 transition hover:text-navy-900', mode === m && 'bg-navy-900 text-white hover:text-white')}
                  title={m === 'chart' ? 'Chart' : 'Table'}
                >
                  {m === 'chart' ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
                  <span className="sr-only">{m === 'chart' ? 'Show chart' : 'Show table'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {mode === 'table' && table ? (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  {table.columns.map((c) => (
                    <TH key={c}>{c}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {table.rows.map((row, i) => (
                  <TR key={i}>
                    {row.map((cell, j) => (
                      <TD key={j} className={cn('py-2', typeof cell === 'number' && 'tabular')}>
                        {cell}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : (
          children
        )}
        {footnote && <p className="mt-3 text-xs text-navy-400">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

export function NoData({ text = 'No data yet.' }: { text?: string }) {
  return <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-navy-400">{text}</div>;
}

// ---------------------------------------------------------------- horizontal bars

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** text shown at the bar tip; defaults to the value */
  valueLabel?: string;
  detail?: string;
  color?: string;
}

/** Horizontal bars (nominal categories → one hue). Each row is a button; value sits at the bar tip. */
export function HBarChart({
  data,
  onSelect,
  color = vizSeries,
  max,
  labelWidth = '38%',
}: {
  data: BarDatum[];
  onSelect?: (d: BarDatum) => void;
  color?: string;
  max?: number;
  labelWidth?: string;
}) {
  const { ref, bind, node } = useTip();
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <NoData />;
  return (
    <div ref={ref} className="relative">
      <ul className="space-y-0.5">
        {data.map((d) => {
          const width = (d.value / top) * 82;
          const content = (
            <>
              <span className="truncate pr-3 text-left text-[13px] text-navy-700" style={{ width: labelWidth }} title={d.label}>
                {d.label}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="h-3.5 shrink-0 rounded-r-[4px] transition-[filter] group-hover:brightness-110"
                  style={{ width: `${Math.max(d.value > 0 ? 1.5 : 0, width)}%`, background: d.color ?? color }}
                />
                <span className="tabular shrink-0 text-[13px] font-semibold text-navy-900">{d.valueLabel ?? d.value}</span>
              </span>
              {onSelect && <ChevronRight className="size-4 shrink-0 text-navy-200 transition group-hover:text-navy-600" />}
            </>
          );
          const rowClass = 'group flex w-full items-center rounded-md px-2 py-1.5 outline-none transition hover:bg-gold-50/70 focus-visible:bg-gold-50';
          return (
            <li key={d.key}>
              {onSelect ? (
                <button type="button" className={rowClass} onClick={() => onSelect(d)} {...bind({ value: d.valueLabel ?? String(d.value), label: d.label, detail: d.detail ?? 'Click to see the students' })}>
                  {content}
                </button>
              ) : (
                <div className={rowClass} {...bind({ value: d.valueLabel ?? String(d.value), label: d.label, detail: d.detail })} tabIndex={0}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {node}
    </div>
  );
}

// ---------------------------------------------------------------- columns (ordered bands)

/** Vertical columns for ordered bands; colored with the ordinal ramp so the order reads in the color. */
export function ColumnChart({ data, onSelect, height = 170 }: { data: BarDatum[]; onSelect?: (d: BarDatum) => void; height?: number }) {
  const { ref, bind, node } = useTip();
  const top = Math.max(1, ...data.map((d) => d.value));
  const ramp = data.length <= 4 ? vizOrdinal.slice(1) : vizOrdinal;
  if (!data.some((d) => d.value > 0)) return <NoData />;
  return (
    <div ref={ref} className="relative">
      <div className="flex items-end justify-around gap-2 border-b px-2" style={{ height, borderColor: vizChrome.axis }}>
        {data.map((d, i) => {
          const h = (d.value / top) * (height - 28);
          const Comp = onSelect ? 'button' : 'div';
          return (
            <Comp
              key={d.key}
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(d) : undefined}
              className="group flex h-full min-w-12 flex-1 flex-col items-center justify-end rounded-t-md outline-none hover:bg-gold-50/60 focus-visible:bg-gold-50"
              {...bind({ value: d.valueLabel ?? String(d.value), label: d.label, detail: d.detail })}
            >
              <span className="tabular mb-1 text-[13px] font-semibold text-navy-900">{d.valueLabel ?? d.value}</span>
              <span
                className="w-6 rounded-t-[4px] transition-[filter] group-hover:brightness-110"
                style={{ height: Math.max(d.value > 0 ? 3 : 0, h), background: d.color ?? ramp[Math.min(i, ramp.length - 1)] }}
              />
            </Comp>
          );
        })}
      </div>
      <div className="flex justify-around gap-2 px-2 pt-2">
        {data.map((d) => (
          <div key={d.key} className="min-w-12 flex-1 text-center">
            <div className="text-xs font-medium text-navy-700">{d.label}</div>
            {d.detail && <div className="text-[11px] text-navy-400">{d.detail}</div>}
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}

// ---------------------------------------------------------------- 100% stacked share bar

const INK_ON: Record<string, string> = {
  '#2a78d6': '#ffffff',
  '#eb6834': '#1F3350',
  '#1baf7a': '#1F3350',
  '#eda100': '#1F3350',
  '#e87ba4': '#1F3350',
  '#008300': '#ffffff',
  '#6250d6': '#ffffff',
  '#e34948': '#ffffff',
};

/** Part-to-whole in one bar: categorical slots in fixed order, 2px surface gaps, legend always shown. */
export function ShareBar({ data, onSelect }: { data: BarDatum[]; onSelect?: (d: BarDatum) => void }) {
  const { ref, bind, node } = useTip();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <NoData text="No answers yet." />;
  const colored = data.map((d, i) => ({ ...d, color: d.color ?? vizCategorical[i % vizCategorical.length] }));
  return (
    <div ref={ref} className="relative">
      <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px] bg-white">
        {colored
          .filter((d) => d.value > 0)
          .map((d) => {
            const share = d.value / total;
            const Comp = onSelect ? 'button' : 'div';
            return (
              <Comp
                key={d.key}
                type={onSelect ? 'button' : undefined}
                onClick={onSelect ? () => onSelect(d) : undefined}
                className="flex h-full items-center justify-center text-[11px] font-semibold outline-none transition-[filter] hover:brightness-110 focus-visible:brightness-110"
                style={{ width: `${share * 100}%`, background: d.color, color: INK_ON[d.color!] ?? '#1F3350' }}
                {...bind({ value: `${d.value} · ${pct(share)}`, label: d.label, detail: onSelect ? 'Click to see the students' : undefined })}
              >
                {share >= 0.14 ? pct(share) : null}
              </Comp>
            );
          })}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {colored.map((d) => (
          <li key={d.key}>
            <button
              type="button"
              disabled={!onSelect || d.value === 0}
              onClick={() => onSelect?.(d)}
              className="inline-flex items-center gap-1.5 rounded px-0.5 text-xs text-navy-700 enabled:hover:text-navy-900 enabled:hover:underline"
            >
              <span className="size-2.5 rounded-[2px]" style={{ background: d.color }} />
              {d.label}
              <span className="tabular font-semibold text-navy-900">{d.value}</span>
            </button>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}

// ---------------------------------------------------------------- funnel

export interface FunnelDatum {
  key: string;
  label: string;
  hint?: string;
  value: number;
}

/** Ordered stages (ordinal ramp, light → dark) with the share that continued from the previous stage. */
export function Funnel({ steps, onSelect }: { steps: FunnelDatum[]; onSelect?: (step: FunnelDatum) => void }) {
  const { ref, bind, node } = useTip();
  const top = Math.max(1, steps[0]?.value ?? 1);
  const ramp = vizOrdinal.slice(Math.max(0, vizOrdinal.length - steps.length));
  if (!steps.length) return <NoData />;
  return (
    <div ref={ref} className="relative">
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const prev = steps[i - 1]?.value;
          const conversion = prev ? s.value / prev : null;
          const Comp = onSelect ? 'button' : 'div';
          return (
            <li key={s.key}>
              <Comp
                type={onSelect ? 'button' : undefined}
                onClick={onSelect ? () => onSelect(s) : undefined}
                className="group grid w-full grid-cols-[minmax(0,34%)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-gold-50/70 focus-visible:bg-gold-50"
                {...bind({ value: s.value.toLocaleString('en-US'), label: s.label, detail: conversion != null ? `${pct(conversion)} of the previous step` : s.hint })}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-navy-900">{s.label}</span>
                  {s.hint && <span className="block truncate text-[11px] text-navy-400">{s.hint}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-4 rounded-r-[4px] transition-[filter] group-hover:brightness-110" style={{ width: `${Math.max(s.value > 0 ? 1.5 : 0, (s.value / top) * 88)}%`, background: ramp[i] }} />
                  <span className="tabular text-[13px] font-semibold text-navy-900">{s.value.toLocaleString('en-US')}</span>
                </span>
                <span className="tabular w-16 text-right text-xs text-navy-600">{conversion != null ? `${pct(conversion)} ↓` : `${pct(s.value / top)}`}</span>
              </Comp>
            </li>
          );
        })}
      </ol>
      {node}
    </div>
  );
}

// ---------------------------------------------------------------- weekly trend (two series, one count axis)

export interface TrendSeries {
  key: string;
  label: string;
}

export function TrendChart({
  data,
  series,
  onSelect,
}: {
  data: { label: string; start: number; end: number; [k: string]: number | string }[];
  series: TrendSeries[];
  onSelect?: (point: { start: number; end: number }) => void;
}) {
  const colors = [vizCategorical[0], vizCategorical[1]];
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-4" aria-label="Legend">
        {series.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-2 text-xs text-navy-700">
            <span className="h-0.5 w-4 rounded" style={{ background: colors[i] }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (onSelect && Number.isFinite(index) && data[index]) onSelect(data[index]);
            }}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
          >
            <CartesianGrid stroke={vizChrome.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: vizChrome.tick }} tickLine={false} axisLine={{ stroke: vizChrome.axis }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: vizChrome.tick }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ stroke: vizChrome.axis, strokeWidth: 1 }}
              contentStyle={{ borderRadius: 10, border: '1px solid rgba(31,51,80,0.12)', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(31,51,80,0.2)' }}
              labelFormatter={(label) => `Week of ${label}`}
              formatter={(value, name) => [value, series.find((s) => s.key === name)?.label ?? name]}
            />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={colors[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: colors[i], stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- meter (single ratio)

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-navy-700">{label}</span>
        <span className="font-semibold text-navy-900">{pct(value)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full" style={{ background: '#cde2fb' }}>
        <div className="h-2 rounded-full" style={{ width: pct(value), background: vizSeries }} />
      </div>
    </div>
  );
}
