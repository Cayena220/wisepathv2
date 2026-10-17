import { formatDate, timeAgo } from '@wisepath/shared';
import { Building2, KeyRound, Power, PowerOff, UserPlus } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router';
import { DeptDot, ErrorState, PageHeader, StatusBadge } from '@/components/data/display';
import { AuditList } from '@/pages/shared/AuditLogPage';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { useUserDoc } from '@/lib/data/accounts';
import { useDepartments } from '@/lib/data/catalog';
import { useAuditLog } from '@/lib/data/results';
import { AdminActionDialog, type AdminAction } from './AdminsPage';

export function AdminDetailPage() {
  const { uid } = useParams();
  const { data: admin, isLoading, error } = useUserDoc(uid);
  const { byId } = useDepartments();
  const [action, setAction] = React.useState<AdminAction>(null);
  const targetLog = useAuditLog({ departmentId: null, isSuperAdmin: true, targetId: uid ?? null, max: 30 });
  const actorLog = useAuditLog({ departmentId: admin?.departmentId ?? null, isSuperAdmin: true, max: 30 });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (error || !admin || admin.role !== 'admin') return <ErrorState error={error ?? new Error('Admin not found.')} />;
  const dept = admin.departmentId ? byId.get(admin.departmentId) : undefined;
  const holdsSlot = dept?.adminUid === admin.id;
  const theirActions = (actorLog.data ?? []).filter((log) => log.actorUid === admin.id);

  return (
    <>
      <PageHeader
        eyebrow="Department admin"
        title={admin.displayName}
        description={admin.email}
        actions={
          admin.status === 'active' ? (
            <>
              <Button variant="outline" onClick={() => setAction({ kind: 'reset', admin })}>
                <KeyRound /> Send password reset
              </Button>
              <Button variant="destructive-outline" onClick={() => setAction({ kind: 'disable', admin })}>
                <PowerOff /> Disable
              </Button>
            </>
          ) : (
            <>
              {dept && !dept.adminUid && (
                <Button variant="outline" asChild>
                  <Link to={`/admins/new?department=${dept.id}`}>
                    <UserPlus /> Create replacement
                  </Link>
                </Button>
              )}
              <Button onClick={() => setAction({ kind: 'enable', admin })} disabled={Boolean(dept?.adminUid)}>
                <Power /> Re-enable
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-[13px] font-medium text-navy-600">Status</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={admin.status} />
            {admin.mustChangePassword && admin.status === 'active' && <Badge tone="amber">Awaiting first sign-in</Badge>}
          </div>
          <div className="mt-3 text-xs text-navy-600">
            {admin.status === 'disabled' ? `Disabled ${timeAgo(admin.disabledAt)}` : `Last sign-in ${admin.lastLoginAt ? timeAgo(admin.lastLoginAt) : 'never'}`}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-navy-600">
            <Building2 className="size-4" /> Department
          </div>
          {dept ? (
            <Link to={`/departments/${dept.id}`} className="mt-2 flex items-center gap-2 font-semibold text-navy-900 hover:underline">
              <DeptDot color={dept.color} /> {dept.name}
            </Link>
          ) : (
            <div className="mt-2 text-navy-600">—</div>
          )}
          <div className="mt-2 text-xs text-navy-600">{holdsSlot ? 'Holds the department’s admin slot' : 'Not holding the slot'}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-medium text-navy-600">Account</div>
          <dl className="mt-2 space-y-1 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="text-navy-600">Created</dt>
              <dd className="text-navy-900">{formatDate(admin.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-navy-600">Created by</dt>
              <dd className="text-navy-900">{admin.createdByName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-navy-600">Password set</dt>
              <dd className="text-navy-900">{admin.passwordChangedAt ? formatDate(admin.passwordChangedAt) : 'Not yet'}</dd>
            </div>
          </dl>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Account history</CardTitle>
          </CardHeader>
          <AuditList logs={targetLog.data} loading={targetLog.isLoading} error={targetLog.error} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Their recent changes</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AuditList logs={theirActions} loading={actorLog.isLoading} error={actorLog.error} emptyText="No changes made yet." />
          </CardContent>
        </Card>
      </div>
      <AdminActionDialog action={action} onDone={() => setAction(null)} />
    </>
  );
}
