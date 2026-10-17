import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, MailCheck } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/primitives';
import { auth } from '@/lib/firebase';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    // Always show the same message so the page does not reveal which emails have accounts.
    await sendPasswordResetEmail(auth, email.trim()).catch(() => undefined);
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthLayout>
      <Link to="/login" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-600 hover:text-navy-900">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      {sent ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/20">
            <MailCheck className="size-6" />
          </span>
          <h1 className="text-xl font-bold text-navy-900">Check your email</h1>
          <p className="mt-2 text-sm text-navy-600">If {email} has a WisePath login, a reset link is on its way.</p>
        </div>
      ) : (
        <>
          <h1 className="text-[22px] font-bold tracking-tight text-navy-900">Reset your password</h1>
          <p className="mt-1 text-sm text-navy-600">We’ll email you a link to choose a new password.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" size="lg" loading={busy}>
              Send reset link
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
