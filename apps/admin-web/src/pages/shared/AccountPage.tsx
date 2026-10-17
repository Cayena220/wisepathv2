import { formatDate, initials, toNameLower } from '@wisepath/shared';
import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { Building2, KeyRound, LogOut, Save, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, PageHeader } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, CardTitle, Field, Input } from '@/components/ui/primitives';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/utils';

export function AccountPage() {
  const { account, department, isSuperAdmin, user, signOut } = useAuth();
  const [name, setName] = React.useState(account?.displayName ?? '');
  const [busy, setBusy] = React.useState(false);
  if (!account || !user) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 3) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName: clean, nameLower: toNameLower(clean), updatedAt: serverTimestamp() });
      if (department && department.adminUid === user.uid) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'departments', department.id), { adminName: clean, updatedAt: serverTimestamp(), updatedBy: user.uid, updatedByName: clean });
        await batch.commit().catch(() => undefined); // only the Super Admin may edit departments; the name syncs on their next change
      }
      toast.success('Name updated');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Your account" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-teal-700 text-lg font-bold text-white">
              {initials(account.displayName)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-navy-900">{account.displayName}</div>
              <div className="truncate text-sm text-navy-600">{account.email}</div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-navy-600">Role</span>
              {isSuperAdmin ? (
                <Badge tone="navy">
                  <ShieldCheck /> Super Admin
                </Badge>
              ) : (
                <Badge tone="gold">
                  <Building2 /> Department Admin
                </Badge>
              )}
            </div>
            {department && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-navy-600">Department</span>
                <span className="flex items-center gap-1.5 text-right font-medium text-navy-900">
                  <DeptDot color={department.color} /> {department.name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-navy-600">Member since</span>
              <span className="text-navy-900">{formatDate(account.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-600">Password last set</span>
              <span className="text-navy-900">{account.passwordChangedAt ? formatDate(account.passwordChangedAt) : '—'}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/change-password">
                <KeyRound /> Change password
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              <LogOut /> Sign out
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Display name</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Name shown in the audit log" htmlFor="name" className="flex-1">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Button type="submit" loading={busy} disabled={name.trim().length < 3 || name.trim() === account.displayName}>
                <Save /> Save
              </Button>
            </form>
            <p className="mt-4 text-xs text-navy-600">
              {isSuperAdmin
                ? 'Your email and the Super Admin role can only be changed with the bootstrap script (see the README).'
                : 'Your email, role and department can only be changed by the Super Admin.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
