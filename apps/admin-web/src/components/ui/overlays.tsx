/* Radix-based overlays and controls: Dialog, AlertDialog, Sheet, DropdownMenu, Tabs, Switch, Checkbox. */
import { Check, X } from 'lucide-react';
import {
  AlertDialog as AlertDialogPrimitive,
  Checkbox as CheckboxPrimitive,
  Dialog as DialogPrimitive,
  DropdownMenu as DropdownPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
} from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

const overlayClass = 'fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in';

// ---------------------------------------------------------------- Dialog
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border bg-white p-6 shadow-[var(--shadow-lift)] data-[state=open]:animate-slide-up',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-navy-400 transition hover:bg-navy-900/5 hover:text-navy-900">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 pr-6', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end', className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold tracking-tight text-navy-900', className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

// ---------------------------------------------------------------- AlertDialog
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={overlayClass} />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-white p-6 shadow-[var(--shadow-lift)] data-[state=open]:animate-slide-up',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}
export const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) => (
  <AlertDialogPrimitive.Title className={cn('text-lg font-semibold text-navy-900', className)} {...props} />
);
export const AlertDialogDescription = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) => (
  <AlertDialogPrimitive.Description className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
);
export const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) => (
  <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
);
export const AlertDialogAction = AlertDialogPrimitive.Action;

// ---------------------------------------------------------------- Sheet (mobile navigation)
export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-parchment shadow-[var(--shadow-lift)] data-[state=open]:animate-[slide-in_0.25s_ease-out]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------------------------------------------------------- DropdownMenu
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn('z-50 min-w-48 rounded-xl border bg-white p-1.5 shadow-[var(--shadow-lift)] data-[state=open]:animate-fade-in', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-navy-900 outline-none select-none data-[highlighted]:bg-gold-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-navy-600',
        className,
      )}
      {...props}
    />
  );
}
export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Label>) => (
  <DropdownPrimitive.Label className={cn('px-2.5 py-1.5 text-xs text-muted-foreground', className)} {...props} />
);
export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Separator>) => (
  <DropdownPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...props} />
);

// ---------------------------------------------------------------- Tabs
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden rounded-xl border bg-white/70 p-1 backdrop-blur [scrollbar-width:none]', className)}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-navy-600 transition hover:text-navy-900 data-[state=active]:bg-navy-900 data-[state=active]:text-white data-[state=active]:shadow-sm [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn('mt-4 outline-none data-[state=active]:animate-fade-in', className)} {...props} />
);

// ---------------------------------------------------------------- Switch / Checkbox
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-teal-600 data-[state=unchecked]:bg-navy-200 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-[18px] shrink-0 rounded-[5px] border border-input bg-white shadow-xs transition data-[state=checked]:border-navy-900 data-[state=checked]:bg-navy-900 data-[state=checked]:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
