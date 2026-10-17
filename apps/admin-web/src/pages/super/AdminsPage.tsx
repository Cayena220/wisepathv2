import { timeAgo, type UserDoc } from '@wisepath/shared';
import { KeyRound, MoreHorizontal, Power, PowerOff, UserCog, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useActor } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, PageHeader, StatusBadge, useRowLink } from '@/components/data/display';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/overlays';
import { Badge, Card, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { disableAdmin, enableAdmin, sendAdminPasswordReset, useAdmins } from '@/lib/data/accounts';
import { useDepartments } from '@/lib/data/catalog';
import { errorMessage } from '@/lib/utils';

export type AdminAction = { kind: 'disable' | 'enable' | 'reset'; admin: UserDoc } | null;

export function AdminActionDialog({ action, onDone }: { action: AdminAction; onDone: () => void }) {
  const actor = useActor();
  const client = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const run = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === 'disable') await disableAdmin(actor, action.admin);
      if (action.kind === 'enable') await enableAdmin(actor, action.admin);
      if (action.kind === 'reset') await sendAdminPasswordReset(actor, action.admin);
      toast.success(
        action.kind === 'disable'
          ? `${action.admin.displayName} disabled — their department slot is free`
          : action.kind === 'enable'
            ? `${action.admin.displayName} re-enabled`
            : `Password reset email sent to ${action.admin.email}`,
      );
      await client.invalidateQueries({ queryKey: ['audit'] });
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const copy = {
    disable: {
      title: 'Disable this admin?',
      body: 'They are signed out immediately and lose all access. Their department’s admin slot becomes free, so you can create a replacement. Their programs stay with the department.',
      cta: 'Disable admin',
    },
    enable: {
      title: 'Re-enable this admin?',
      body: 'They take back their department’s admin slot. This only works while the slot is still empty.',
      cta: 'Re-enable',
    },
    reset: {
      title: 'Send a password reset email?',
      body: 'Firebase emails them a link to choose a new password. (On the free Spark plan the website cannot set another person’s password directly.)',
      cta: 'Send email',
    },
  }[action?.kind ?? 'disable'];

  return (
    <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && onDone()}>
      <AlertDialogContent>
        <AlertDialogTitle>{copy.title}</AlertDialogTitle>
        <AlertDialogDescription>
          <span className="font-medium text-navy-900">
            {action?.admin.displayName} &lt;{action?.admin.email}&gt;
          </span>
          <br />
          {copy.body}
        </AlertDialogDescription>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: action?.kind === 'disable' ? 'destructive' : 'default' })}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
            disabled={busy}
          >
            {copy.cta}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminsPage() {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { data, isLoading, error } = useAdmins();
  const { byId, departments } = useDepartments();
  const [action, setAction] = React.useState<AdminAction>(null);
  const admins = [...(data ?? [])].sort((a, b) => (a.status === b.status ? a.displayName.localeCompare(b.displayName) : a.status === 'active' ? -1 : 1));
  const openSlots = departments.filter((d) => d.status === 'active' && !d.adminUid);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Admins"
        description="One admin per department. New admins get a one-time password and must choose their own at first sign-in."
        actions={
          <Button asChild variant="gold" disabled={!openSlots.length}>
            <Link to="/admins/new">
              <UserPlus /> Create admin
            </Link>
          </Button>
        }
      />
      {openSlots.length > 0 && (
        <div className="mb-4 rounded-xl border border-gold-500/25 bg-gold-50/80 px-4 py-3 text-sm text-navy-900">
          <span className="font-semibold">{openSlots.length} department(s) without an admin:</span>{' '}
          {openSlots.map((d, i) => (
            <React.Fragment key={d.id}>
              {i > 0 && ', '}
              <Link to={`/admins/new?department=${d.id}`} className="font-medium text-teal-700 hover:underline">
                {d.code}
              </Link>
            </React.Fragment>
          ))}
        </div>
      )}
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <ErrorState error={error} />
          </div>
        ) : isLoading ? (
          <ListSkeleton />
        ) : !admins.length ? (
          <EmptyState icon={UserCog} title="No admins yet" description="Create one admin for each department." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Admin</TH>
                <TH>Department</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Last sign-in</TH>
                <TH className="w-12" />
              </TR>
            </THead>
            <TBody>
              {admins.map((admin) => {
                const dept = admin.departmentId ? byId.get(admin.departmentId) : undefined;
                const link = rowLink(() => navigate(`/admins/${admin.id}`));
                return (
                  <TR key={admin.id} {...link}>
                    <TD>
                      <div className="font-medium text-navy-900">{admin.displayName}</div>
                      <div className="text-xs text-navy-600">{admin.email}</div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <DeptDot color={dept?.color} />
                        <span className="text-navy-900">{dept?.code ?? '—'}</span>
                      </div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={admin.status} />
                        {admin.status === 'active' && admin.mustChangePassword && <Badge tone="amber">Awaiting first sign-in</Badge>}
                      </div>
                    </TD>
                    <TD className="hidden text-navy-600 lg:table-cell">{admin.lastLoginAt ? timeAgo(admin.lastLoginAt) : 'Never'}</TD>
                    <TD onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${admin.displayName}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/admins/${admin.id}`)}>
                            <UserCog /> View details
                          </DropdownMenuItem>
                          {admin.status === 'active' ? (
                            <>
                              <DropdownMenuItem onSelect={() => setAction({ kind: 'reset', admin })}>
                                <KeyRound /> Send password reset
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setAction({ kind: 'disable', admin })} className="text-rust-600 [&_svg]:text-rust-600">
                                <PowerOff /> Disable
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onSelect={() => setAction({ kind: 'enable', admin })}>
                              <Power /> Re-enable
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
      <AdminActionDialog action={action} onDone={() => setAction(null)} />
    </>
  );
}
