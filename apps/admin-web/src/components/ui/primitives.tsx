/* Small styled primitives: Card, Input, Textarea, Label, Badge, Skeleton, Separator, NativeSelect, Table. */
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import { Label as LabelPrimitive, Separator as SeparatorPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------- Card
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-[var(--shadow-card)]', className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-5 pb-3 sm:px-6', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-[15px] font-semibold tracking-tight text-navy-900', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5 sm:px-6', className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-2 border-t px-5 py-3 sm:px-6', className)} {...props} />;
}

// ---------------------------------------------------------------- Form controls
const fieldBase =
  'w-full rounded-lg border border-input bg-white px-3 text-sm text-navy-900 shadow-xs transition-colors placeholder:text-navy-400 focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-3 focus-visible:ring-gold-500/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-rust-600 aria-invalid:ring-rust-600/15';

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBase, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, 'h-10 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-navy-400" />
    </div>
  );
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-[13px] font-medium text-navy-900 select-none', className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  required,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-rust-600">*</span>}
        </Label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-rust-600">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------- Badge
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'border-navy-900/10 bg-navy-50 text-navy-700',
        gold: 'border-gold-500/25 bg-gold-50 text-gold-700',
        teal: 'border-teal-600/20 bg-teal-50 text-teal-700',
        green: 'border-green-600/20 bg-green-100 text-green-600',
        rust: 'border-rust-600/20 bg-rust-100 text-rust-700',
        amber: 'border-amber-600/25 bg-amber-100 text-amber-600',
        navy: 'border-navy-900 bg-navy-900 text-white',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// ---------------------------------------------------------------- Skeleton / Separator
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-navy-900/[0.06]', className)} {...props} />;
}

export function Separator({ className, orientation = 'horizontal', ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------- Table
export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('sticky top-0 z-[1] bg-[#faf7f0] [&_tr]:border-b', className)} {...props} />;
}
export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}
export function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b transition-colors', className)} {...props} />;
}
export function TH({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn('h-10 px-4 text-left align-middle text-xs font-semibold tracking-wide text-navy-600 uppercase whitespace-nowrap', className)}
      {...props}
    />
  );
}
export function TD({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}
