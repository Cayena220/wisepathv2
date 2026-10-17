import { formatManila, timeAgo } from '@wisepath/shared';
import { ArrowRight, BarChart3, Building2, ClipboardCheck, GraduationCap, ShieldCheck, Trophy, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { ActivityFeed } from '@/components/data/ActivityFeed';
import { useSegmentDialog } from '@/components/analytics/SegmentDialog';
import { InterestsCard, MatchStrengthCard, SuperFunnelCard, TrendCard } from '@/components/analytics/widgets';
import { BarList, PageHeader, SectionTitle, StatCard } from '@/components/data/display';
import { RegistrationPill } from '@/components/data/RegistrationPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { useRegistrationSettings } from '@/lib/data/accounts';
import { useDepartments } from '@/lib/data/catalog';
import { useAnalyticsSample } from '@/lib/data/analytics';
import { useAuditLog, useOverviewStats } from '@/lib/data/results';
import { percent } from '@/lib/utils';

export function OverviewPage() {
  const { actor } = useAuth();
  const { departments, isLoading: deptLoading } = useDepartments();
  const active = departments.filter((d) => d.status === 'active');
  const stats = useOverviewStats(active.map((d) => d.id));
  const registration = useRegistrationSettings();
  const audit = useAuditLog({ departmentId: null, isSuperAdmin: true, max: 6 });
  const withAdmin = active.filter((d) => d.adminUid).length;
  const sample = useAnalyticsSample(null);
  const segment = useSegmentDialog(sample.data?.results, sample.data?.attempts);
  const s = stats.data;

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title={`Good day, ${actor?.name.split(' ')[0] ?? ''}`}
        description="Everything across WisePath: departments and their admins, student registration, and results."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/analytics">
                <BarChart3 /> Analytics
              </Link>
            </Button>
            <Button asChild variant="gold">
              <Link to="/admins/new">
                <UserCog /> Create admin
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered students" value={s?.students ?? 0} loading={stats.isLoading} icon={Users} to="/students" hint="All student accounts on Android" />
        <StatCard
          label="Completion rate"
          value={`${percent(s?.studentsWithResult ?? 0, s?.students ?? 0)}%`}
          loading={stats.isLoading}
          icon={Trophy}
          tone="teal"
          to="/results?view=latest"
          hint={`${s?.studentsWithResult ?? 0} of ${s?.students ?? 0} took the career assessment`}
        />
        <StatCard label="Assessments · 30 days" value={s?.results30d ?? 0} loading={stats.isLoading} icon={ClipboardCheck} tone="gold" to="/results?since=30" hint={`${s?.results ?? 0} all time`} />
        <StatCard
          label="Departments with an admin"
          value={`${withAdmin}/${active.length}`}
          loading={deptLoading}
          icon={Building2}
          tone={withAdmin < active.length ? 'rust' : 'teal'}
          to="/departments"
          hint={withAdmin < active.length ? `${active.length - withAdmin} department(s) need an admin` : 'Every department is covered'}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Best matches by department</CardTitle>
            <CardDescription>Students whose latest top match is in each department. Click a department to see them.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <BarList
                items={active
                  .map((d) => ({
                    id: d.id,
                    label: d.name,
                    sublabel: d.code,
                    value: s?.departmentCounts[d.id] ?? 0,
                    color: d.color,
                    to: `/results?view=best&department=${d.id}`,
                  }))
                  .sort((a, b) => b.value - a.value)}
                emptyText="No departments yet."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Student registration</CardTitle>
              <CardDescription>Controls who can create an account on Android.</CardDescription>
            </div>
            <ShieldCheck className="size-5 text-gold-700" />
          </CardHeader>
          <CardContent className="space-y-4">
            {registration.isLoading ? <Skeleton className="h-7 w-40" /> : <RegistrationPill settings={registration.data} />}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface/70 p-3">
                <dt className="text-xs text-navy-600">Opens</dt>
                <dd className="mt-0.5 font-medium text-navy-900">{registration.data?.opensAt ? formatManila(registration.data.opensAt.toMillis()) : 'Any time'}</dd>
              </div>
              <div className="rounded-xl bg-surface/70 p-3">
                <dt className="text-xs text-navy-600">Closes</dt>
                <dd className="mt-0.5 font-medium text-navy-900">{registration.data?.closesAt ? formatManila(registration.data.closesAt.toMillis()) : 'Not scheduled'}</dd>
              </div>
            </dl>
            <Button asChild variant="outline" className="w-full">
              <Link to="/registration">Manage registration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TrendCard departmentId={null} isSuperAdmin />
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <SectionTitle action={<Link to="/results" className="text-[13px] font-medium text-teal-700 hover:underline">All results</Link>}>
              Recent student activity
            </SectionTitle>
          </CardHeader>
          <ActivityFeed departmentId={null} isSuperAdmin />
        </Card>
      </div>

      <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Insights</h2>
          <p className="text-sm text-navy-600">Student journey and match quality across all departments. Click any bar to see who is behind it.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/analytics">
            <BarChart3 /> Full analytics <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SuperFunnelCard />
        {sample.isLoading || !sample.data ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : (
          <MatchStrengthCard stats={sample.data.resultStats} open={segment.open} />
        )}
        {sample.data && <InterestsCard stats={sample.data.resultStats} open={segment.open} limit={6} className="xl:col-span-2" />}
      </div>
      {segment.dialog}

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="pb-2">
          <SectionTitle action={<Link to="/audit-log" className="text-[13px] font-medium text-teal-700 hover:underline">Full audit log</Link>}>
            Recent admin actions
          </SectionTitle>
        </CardHeader>
        <ul className="divide-y">
          {(audit.data ?? []).map((log) => (
            <li key={log.id}>
              <Link to={`/audit-log?focus=${log.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-gold-50/70">
                <GraduationCap className="size-4 shrink-0 text-navy-400" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-navy-900">{log.actorName}</span>{' '}
                  <span className="text-navy-600">{log.action.replace('.', ' ').replace('_', ' ')}</span>{' '}
                  <span className="text-navy-900">{log.targetLabel}</span>
                </span>
                <span className="shrink-0 text-xs text-navy-400">{timeAgo(log.createdAt)}</span>
              </Link>
            </li>
          ))}
          {!audit.isLoading && !audit.data?.length && <li className="px-5 py-6 text-sm text-navy-600">No admin actions yet.</li>}
        </ul>
      </Card>
    </>
  );
}
