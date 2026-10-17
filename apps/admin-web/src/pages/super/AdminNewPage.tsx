import { AlertTriangle, Check, Copy, KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useActor } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Checkbox, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/overlays';
import { Card, CardContent, Field, Input, Label, NativeSelect } from '@/components/ui/primitives';
import { createDepartmentAdmin, type CreatedAdmin } from '@/lib/data/accounts';
import { useDepartments } from '@/lib/data/catalog';
import { errorMessage } from '@/lib/utils';

/** Shows the one-time password exactly once. It is never stored anywhere. */
function TempPasswordReveal({ created, onClose }: { created: CreatedAdmin | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  React.useEffect(() => {
    setCopied(false);
    setConfirmed(false);
  }, [created]);
  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.tempPassword).catch(() => undefined);
    setCopied(true);
    toast.success('One-time password copied');
  };
  return (
    <Dialog open={Boolean(created)} onOpenChange={(open) => !open && confirmed && onClose()}>
      <DialogContent hideClose onEscapeKeyDown={(e) => !confirmed && e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/20">
            <ShieldCheck className="size-5" />
          </span>
          <DialogTitle>Admin account created</DialogTitle>
          <DialogDescription>
            Give <span className="font-medium text-navy-900">{created?.email}</span> this one-time password. They must replace it at first sign-in.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border-2 border-dashed border-gold-500/40 bg-gold-50 p-4">
          <div className="text-[11px] font-semibold tracking-wider text-gold-700 uppercase">One-time password</div>
          <div className="mt-1 flex items-center gap-3">
            <code className="flex-1 font-mono text-lg font-semibold tracking-wider break-all text-navy-900 select-all">{created?.tempPassword}</code>
            <Button variant={copied ? 'teal' : 'outline'} size="sm" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex gap-2.5 rounded-xl bg-rust-100/60 p-3 text-[13px] text-rust-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This password is shown only now and is not saved anywhere. Share it privately (in person or a direct message), not in a group chat.
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-900">
          <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />I have given this password to the admin
        </label>
        <Button disabled={!confirmed} onClick={onClose} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function AdminNewPage() {
  const actor = useActor();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { departments, isLoading } = useDepartments();
  const openSlots = departments.filter((d) => d.status === 'active' && !d.adminUid);
  const [departmentId, setDepartmentId] = React.useState(params.get('department') ?? '');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<CreatedAdmin | null>(null);

  React.useEffect(() => {
    if (!departmentId && openSlots.length === 1) setDepartmentId(openSlots[0].id);
  }, [departmentId, openSlots]);

  const department = departments.find((d) => d.id === departmentId);
  const valid = Boolean(department && !department.adminUid) && name.trim().length >= 3 && /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!department) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createDepartmentAdmin(actor, { name, email, department });
      setCreated(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Create department admin"
        description="Only you (the Super Admin) can create admins. Each department can have exactly one."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <Field label="Department" htmlFor="dept" required hint={!isLoading && !openSlots.length ? 'Every department already has an admin. Disable one first to replace them.' : 'Only departments without an admin are listed.'}>
                <NativeSelect id="dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                  <option value="" disabled>
                    Choose a department…
                  </option>
                  {openSlots.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                  {department?.adminUid && <option value={department.id}>{department.code} (already has an admin)</option>}
                </NativeSelect>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name" required>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" autoComplete="off" />
                </Field>
                <Field label="Email" htmlFor="email" required hint="They sign in with this email.">
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan.delacruz@school.edu" autoComplete="off" />
                </Field>
              </div>
              {error && (
                <p className="rounded-lg bg-rust-100/70 px-3 py-2 text-sm font-medium text-rust-700" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="gold" disabled={!valid} loading={busy}>
                  <UserPlus /> Create admin & one-time password
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/admins">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="h-fit bg-white/70 p-5">
          <div className="flex items-center gap-2 font-semibold text-navy-900">
            <KeyRound className="size-4 text-gold-700" /> How it works
          </div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-navy-700">
            <li>WisePath creates the login and generates a strong one-time password.</li>
            <li>You copy it once and give it to the admin privately.</li>
            <li>At first sign-in they must set their own password. Until then they can’t see or change anything.</li>
            <li>They can only manage their own department’s programs, assessments and questions.</li>
          </ol>
          <Label className="mt-4 block text-xs text-navy-600">Need to replace an admin? Disable them on the Admins page; the slot frees up.</Label>
        </Card>
      </div>
      <TempPasswordReveal
        created={created}
        onClose={() => {
          const uid = created?.uid;
          setCreated(null);
          navigate(uid ? `/admins/${uid}` : '/admins');
        }}
      />
    </>
  );
}
