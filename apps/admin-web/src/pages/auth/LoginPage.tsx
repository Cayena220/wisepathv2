import { signInWithEmailAndPassword } from 'firebase/auth';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { FullPageLoader } from '@/auth/guards';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { auth } from '@/lib/firebase';
import { errorMessage } from '@/lib/utils';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { status, notice, clearNotice } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (status === 'ready') return <Navigate to={from} replace />;
  if (status === 'mustChangePassword') return <Navigate to="/change-password" replace />;
  if (status === 'loading' && busy) return <FullPageLoader label="Signing in…" />;
  if (status === 'student' || status === 'noAccount') return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearNotice();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[22px] font-bold tracking-tight text-navy-900">Sign in</h1>
      <p className="mt-1 text-sm text-navy-600">For department admins and the Super Admin.</p>

      {notice && (
        <div className="mt-5 flex gap-2.5 rounded-xl border border-amber-600/25 bg-amber-100/70 p-3 text-[13px] text-amber-600">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="text-navy-900">{notice}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-navy-400 hover:text-navy-900"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error && <p className="text-sm font-medium text-rust-600" role="alert">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          <LogIn /> Sign in
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-[13px]">
        <Link to="/forgot-password" className="font-medium text-teal-700 hover:underline">
          Forgot password?
        </Link>
        <span className="text-navy-400">First time? Use your one-time password.</span>
      </div>
    </AuthLayout>
  );
}
