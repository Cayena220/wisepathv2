import { Compass, GraduationCap, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { BrandBackground } from '@/components/layout/BrandBackground';
import { Logo, LogoFull } from '@/components/layout/Logo';
import { useEmulators } from '@/lib/firebase';

/** Split sign-in layout: brand panel (with the strong background) + form card. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandBackground variant="auth" className="fixed" />
      <section className="relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <BrandBackground variant="panel" />
        <Logo onDark subtitle="Administration" className="self-start" />
        <div className="max-w-lg">
          <h2 className="text-[40px] leading-[1.1] font-bold tracking-tight text-white">
            Guide every student to the <span className="text-gold-300">right path.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Manage your department’s programs and assessments, and follow every student’s results — from career matches to program fit.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              { icon: GraduationCap, text: 'One admin per department, with full control of its programs' },
              { icon: Compass, text: 'Clickable results — from department trends down to each answer' },
              { icon: ShieldCheck, text: 'Registration windows set by the Super Admin, enforced on the server' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4 text-gold-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">STI West Negros University · College of Information and Communications Technology</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex justify-center">
            <LogoFull className="h-32 sm:h-36" />
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:p-8">{children}</div>
          {useEmulators && (
            <p className="mt-4 text-center text-xs font-medium text-amber-600">Connected to the local Firebase emulator (test data).</p>
          )}
        </div>
      </section>
    </div>
  );
}
