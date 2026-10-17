import { Loader2, Smartphone, UserX } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { LogoMark } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { useAuth, type StaffRole } from './AuthProvider';

export function FullPageLoader({ label = 'Loading WisePath…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-parchment text-navy-600">
      <LogoMark className="mb-2 h-16 animate-pulse" />
      <Loader2 className="size-6 animate-spin text-gold-700" />
      <div className="text-sm">{label}</div>
    </div>
  );
}

function BlockedScreen({ kind }: { kind: 'student' | 'noAccount' }) {
  const { signOut, user } = useAuth();
  const student = kind === 'student';
  return (
    <AuthLayout>
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 ring-1 ring-gold-500/20">
          {student ? <Smartphone className="size-6" /> : <UserX className="size-6" />}
        </span>
        <h1 className="text-xl font-bold text-navy-900">{student ? 'Students use the WisePath app' : 'No staff access'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">
          {student
            ? 'This website is for department admins and the Super Admin. Open the WisePath Android app to take assessments and see your results.'
            : `${user?.email ?? 'This account'} is not a WisePath admin. Admin accounts are created by the Super Admin.`}
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}

/** Signed in, staff, temporary password already changed. */
export function RequireStaff() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading' || status === 'disabled') return <FullPageLoader />;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (status === 'student' || status === 'noAccount') return <BlockedScreen kind={status} />;
  if (status === 'mustChangePassword') return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

export function RequireRole({ role }: { role: StaffRole }) {
  const { role: current } = useAuth();
  if (current !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { isSuperAdmin } = useAuth();
  return <Navigate to={isSuperAdmin ? '/overview' : '/dashboard'} replace />;
}
