import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-navy-900 text-white shadow-sm hover:bg-navy-700',
        gold: 'bg-gold-700 text-white shadow-sm hover:bg-[#87591a]',
        teal: 'bg-teal-600 text-white shadow-sm hover:bg-teal-700',
        secondary: 'bg-surface text-navy-900 hover:bg-[#efe8d9]',
        outline: 'border border-input bg-white text-navy-900 shadow-xs hover:bg-gold-50 hover:border-gold-300',
        ghost: 'text-navy-700 hover:bg-navy-900/5 hover:text-navy-900',
        destructive: 'bg-rust-600 text-white shadow-sm hover:bg-rust-700',
        'destructive-outline': 'border border-rust-600/30 bg-white text-rust-600 hover:bg-rust-100',
        link: 'text-teal-700 underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  );
}
