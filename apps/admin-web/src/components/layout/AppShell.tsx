import { initials } from '@wisepath/shared';
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  History,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  LogOut,
  Menu,
  MessageCircleQuestion,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SheetContent,
} from '@/components/ui/overlays';
import { Badge } from '@/components/ui/primitives';
import { useEmulators } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { BrandBackground } from './BrandBackground';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUPER_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { to: '/overview', label: 'Overview', icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/departments', label: 'Departments', icon: Building2 },
      { to: '/admins', label: 'Admins', icon: UserCog },
      { to: '/registration', label: 'Registration', icon: ShieldCheck },
    ],
  },
  {
    group: 'Students',
    items: [
      { to: '/students', label: 'Students', icon: Users },
      { to: '/results', label: 'Results', icon: Trophy },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { to: '/programs', label: 'Programs', icon: GraduationCap },
      { to: '/arrange', label: 'Arrange catalog', icon: ListOrdered },
      { to: '/career-questions', label: 'Career questions', icon: MessageCircleQuestion },
      { to: '/program-assessments', label: 'Program assessments', icon: ClipboardCheck },
    ],
  },
  { group: 'System', items: [{ to: '/audit-log', label: 'Audit log', icon: History }] },
];

const ADMIN_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  { group: 'Students', items: [{ to: '/results', label: 'Results', icon: Trophy }] },
  {
    group: 'My department',
    items: [
      { to: '/programs', label: 'Programs', icon: GraduationCap },
      { to: '/program-assessments', label: 'Program assessments', icon: ClipboardCheck },
      { to: '/career-questions', label: 'Career questions', icon: MessageCircleQuestion },
      { to: '/activity', label: 'Activity', icon: ListChecks },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { isSuperAdmin, department } = useAuth();
  const groups = isSuperAdmin ? SUPER_NAV : ADMIN_NAV;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link to="/" onClick={onNavigate}>
          <Logo subtitle={isSuperAdmin ? 'Super Admin' : 'Department Admin'} />
        </Link>
      </div>
      {!isSuperAdmin && department && (
        <div className="mx-3 mb-3 rounded-xl border border-gold-500/20 bg-gold-50/80 px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-wider text-gold-700 uppercase">Your department</div>
          <div className="mt-0.5 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
            <span className="size-2 shrink-0 rounded-full" style={{ background: department.color }} />
            <span className="line-clamp-2">{department.name}</span>
          </div>
        </div>
      )}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group.group}>
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-wider text-navy-400 uppercase">{group.group}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition',
                        isActive ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-700 hover:bg-navy-900/[0.05] hover:text-navy-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute top-1.5 bottom-1.5 -left-3 w-1 rounded-r-full bg-gold-500" />}
                        <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-gold-300' : 'text-navy-400 group-hover:text-navy-700')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {useEmulators && (
        <div className="mx-3 mb-3 rounded-lg border border-amber-600/30 bg-amber-100 px-3 py-2 text-[11px] font-medium text-amber-600">
          Local emulator — test data only
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { actor, account, isSuperAdmin, signOut } = useAuth();
  if (!actor) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 transition hover:bg-navy-900/5 focus-visible:outline-2">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-semibold text-navy-900">{actor.name}</div>
            <div className="text-[11px] text-navy-600">{isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-navy-900 to-teal-700 text-[13px] font-semibold text-white ring-2 ring-white">
            {initials(actor.name)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="font-medium text-navy-900">{actor.name}</div>
          <div className="truncate">{account?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserCog /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/change-password">
            <KeyRound /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="text-rust-600 [&_svg]:text-rust-600">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SEGMENT_LABELS: Record<string, string> = {
  overview: 'Overview',
  analytics: 'Analytics',
  dashboard: 'Dashboard',
  departments: 'Departments',
  arrange: 'Arrange catalog',
  admins: 'Admins',
  registration: 'Registration',
  students: 'Students',
  results: 'Results',
  attempts: 'Fit attempts',
  programs: 'Programs',
  'career-questions': 'Career questions',
  'program-assessments': 'Program assessments',
  'audit-log': 'Audit log',
  activity: 'Activity',
  account: 'Account',
  new: 'New',
  edit: 'Edit',
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[13px] text-navy-600 md:flex">
      {parts.map((part, i) => {
        const href = `/${parts.slice(0, i + 1).join('/')}`;
        const label = SEGMENT_LABELS[part] ?? (part.length > 14 ? `${part.slice(0, 8)}…` : part);
        const last = i === parts.length - 1;
        return (
          <React.Fragment key={href}>
            {i > 0 && <ChevronRight className="size-3.5 text-navy-400" />}
            {last || !SEGMENT_LABELS[part] ? (
              <span className={cn('truncate', last && 'font-medium text-navy-900')}>{label}</span>
            ) : (
              <Link to={href} className="truncate hover:text-navy-900">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { isSuperAdmin, department } = useAuth();
  return (
    <div className="relative isolate min-h-dvh">
      <BrandBackground variant="app" className="fixed" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-navy-900/[0.07] bg-white/60 backdrop-blur-xl lg:block">
        <SidebarNav />
      </aside>
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </DialogPrimitive.Root>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-900/[0.06] bg-parchment/75 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-3">
            {isSuperAdmin ? (
              <Badge tone="navy" className="hidden sm:inline-flex">
                <ShieldCheck /> Super Admin
              </Badge>
            ) : department ? (
              <Badge tone="gold" className="hidden sm:inline-flex">
                <Building2 /> {department.code}
              </Badge>
            ) : null}
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
