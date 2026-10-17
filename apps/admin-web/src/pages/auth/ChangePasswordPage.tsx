import { LIMITS } from '@wisepath/shared';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { ArrowLeft, Check, KeyRound, ShieldAlert } from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import { FullPageLoader } from '@/auth/guards';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { db } from '@/lib/firebase';
import { passwordStrength } from '@/lib/password';
import { cn, errorMessage } from '@/lib/utils';
import { AuthLayout } from './AuthLayout';

export function ChangePasswordPage() {
  const { status, user, account, department, signOut } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'signedOut' || !user) return <Navigate to="/login" replace />;
  if (status !== 'ready' && status !== 'mustChangePassword') return <Navigate to="/" replace />;

  const forced = status === 'mustChangePassword';
  const strength = passwordStrength(next);
  const valid = strength.issues.length === 0 && next === confirm && next !== current && current.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setError(null);
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, current));
      await updatePassword(user, next);
      if (account?.mustChangePassword) {
        await updateDoc(doc(db, 'users', user.uid), {
          mustChangePassword: false,
          passwordChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        // Separate write: the rules only treat the admin as active after the flag flips.
        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'auditLogs')), {
          actorUid: user.uid,
          actorName: account.displayName,
          actorRole: account.role,
          action: 'admin.password_changed',
          targetType: 'admin',
          targetId: user.uid,
          targetLabel: `${account.displayName} <${account.email}>`,
          departmentId: account.departmentId ?? null,
          details: { firstSignIn: true },
          createdAt: serverTimestamp(),
        });
        await batch.commit().catch(() => undefined);
      }
      toast.success('Password updated');
      navigate('/', { replace: true });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'The current password is incorrect.' : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {forced ? (
        <div className="mb-5 flex gap-3 rounded-xl border border-gold-500/25 bg-gold-50 p-3.5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-700" />
          <div className="text-[13px] leading-relaxed text-navy-900">
            <div className="font-semibold">Welcome{account?.displayName ? `, ${account.displayName.split(' ')[0]}` : ''}!</div>
            You signed in with a one-time password{department ? ` for ${department.name}` : ''}. Choose your own password to continue.
          </div>
        </div>
      ) : (
        <Link to="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-600 hover:text-navy-900">
          <ArrowLeft className="size-4" /> Back
        </Link>
      )}
      <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-navy-900">
        <KeyRound className="size-5 text-gold-700" /> {forced ? 'Set your password' : 'Change password'}
      </h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label={forced ? 'One-time password' : 'Current password'} htmlFor="current">
          <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password" htmlFor="next">
          <Input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        {next && (
          <div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full bg-navy-100 transition',
                    strength.score > i && (strength.score >= 3 ? 'bg-teal-600' : strength.score >= 2 ? 'bg-gold-500' : 'bg-rust-600'),
                  )}
                />
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {[`At least ${LIMITS.minAdminPasswordLength} characters`, 'Upper and lower case letters', 'A number', 'A symbol'].map((rule) => {
                const ok = !strength.issues.includes(rule);
                return (
                  <li key={rule} className={cn('flex items-center gap-1.5', ok ? 'text-teal-700' : 'text-navy-400')}>
                    <Check className={cn('size-3.5', !ok && 'opacity-30')} /> {rule}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Field
          label="Confirm new password"
          htmlFor="confirm"
          error={confirm && confirm !== next ? 'Passwords do not match' : next && next === current ? 'Choose a password different from the current one' : undefined}
        >
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        {error && <p className="text-sm font-medium text-rust-600" role="alert">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={!valid} loading={busy}>
          {forced ? 'Save and continue' : 'Update password'}
        </Button>
        {forced && (
          <button type="button" onClick={() => void signOut()} className="w-full text-center text-[13px] text-navy-600 hover:text-navy-900">
            Sign out
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
