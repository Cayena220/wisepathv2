import { formatDate, timeAgo, type AuditLog } from '@wisepath/shared';
import {
  Building2,
  ClipboardCheck,
  GraduationCap,
  History,
  KeyRound,
  MessageCircleQuestion,
  ShieldCheck,
  UserCog,
  Wrench,
} from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/data/display';
import { Card, NativeSelect } from '@/components/ui/primitives';
import { useDepartments } from '@/lib/data/catalog';
import { useAuditLog } from '@/lib/data/results';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  department: Building2,
  admin: UserCog,
  registration: ShieldCheck,
  program: GraduationCap,
  careerQuestion: MessageCircleQuestion,
  programAssessment: ClipboardCheck,
  system: Wrench,
};

const VERBS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  archive: 'archived',
  restore: 'restored',
  delete: 'deleted',
  disable: 'disabled',
  enable: 're-enabled',
  reset_password: 'sent a password reset to',
  password_changed: 'set their own password',
  bootstrap: 'set up',
  seed: 'seeded',
  migrate: 'migrated',
  move: 'moved',
  arrange: 'rearranged',
};

const targetLink = (log: AuditLog): string | null => {
  if (log.action.endsWith('.delete')) return null;
  switch (log.targetType) {
    case 'department':
      return `/departments/${log.targetId}`;
    case 'admin':
      return `/admins/${log.targetId}`;
    case 'registration':
      return '/registration';
    case 'program':
      return `/programs/${log.targetId}`;
    case 'careerQuestion':
      return '/career-questions';
    case 'programAssessment':
      return `/program-assessments/${log.targetId}`;
    case 'system':
      return log.action === 'catalog.arrange' ? '/arrange' : null;
    default:
      return null;
  }
};

export function AuditList({
  logs,
  loading,
  error,
  emptyText = 'No activity yet.',
  focusId,
}: {
  logs: AuditLog[] | undefined;
  loading?: boolean;
  error?: unknown;
  emptyText?: string;
  focusId?: string | null;
}) {
  const { isSuperAdmin } = useAuth();
  const { byId } = useDepartments();
  if (error) return <div className="p-5"><ErrorState error={error} /></div>;
  if (loading) return <ListSkeleton rows={5} />;
  if (!logs?.length) return <EmptyState icon={History} title={emptyText} compact />;
  return (
    <ul className="divide-y">
      {logs.map((log) => {
        const Icon = ICONS[log.targetType] ?? KeyRound;
        const verb = VERBS[log.action.split('.')[1]] ?? log.action;
        let href = targetLink(log);
        if (href?.startsWith('/admins') && !isSuperAdmin) href = null;
        const dept = log.departmentId ? byId.get(log.departmentId) : undefined;
        const body = (
          <div className={cn('flex items-start gap-3 px-5 py-3 text-[13px] transition', href && 'hover:bg-gold-50/70', focusId === log.id && 'bg-gold-50')}>
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-navy-900">
                <span className="font-semibold">{log.actorName}</span> <span className="text-navy-600">{verb}</span>{' '}
                {log.action !== 'admin.password_changed' && <span className="font-medium">{log.targetLabel}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-navy-400">
                <span title={formatDate(log.createdAt, true)}>{timeAgo(log.createdAt)}</span>
                <span>·</span>
                <span className="capitalize">{log.actorRole === 'superadmin' ? 'Super Admin' : log.actorRole}</span>
                {dept && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <DeptDot color={dept.color} /> {dept.code}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
        return <li key={log.id}>{href ? <Link to={href}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

export function AuditLogPage() {
  const { isSuperAdmin, actor, department } = useAuth();
  const [params, setParams] = useSearchParams();
  const action = params.get('action');
  const { data, isLoading, error } = useAuditLog({ departmentId: actor?.departmentId ?? null, isSuperAdmin, action, max: 100 });
  return (
    <>
      <PageHeader
        eyebrow={isSuperAdmin ? 'System' : department?.name}
        title={isSuperAdmin ? 'Audit log' : 'Activity'}
        description={
          isSuperAdmin
            ? 'Every change made by you and the department admins. Entries cannot be edited or deleted.'
            : 'Changes made to your department — by you or the Super Admin. Entries cannot be edited or deleted.'
        }
        actions={
          isSuperAdmin && (
            <div className="w-64">
              <NativeSelect
                value={action ?? ''}
                onChange={(e) => setParams(e.target.value ? { action: e.target.value } : {}, { replace: true })}
                aria-label="Filter by action"
              >
                <option value="">All actions</option>
                <option value="admin.create">Admins created</option>
                <option value="admin.disable">Admins disabled</option>
                <option value="registration.update">Registration changes</option>
                <option value="department.create">Departments created</option>
                <option value="program.create">Programs created</option>
                <option value="program.update">Programs updated</option>
                <option value="program.delete">Programs deleted</option>
                <option value="program.move">Programs moved</option>
                <option value="catalog.arrange">Catalog rearranged</option>
                <option value="question.create">Questions created</option>
                <option value="assessment.update">Assessments updated</option>
              </NativeSelect>
            </div>
          )
        }
      />
      <Card className="overflow-hidden">
        <AuditList logs={data} loading={isLoading} error={error} focusId={params.get('focus')} />
      </Card>
    </>
  );
}
