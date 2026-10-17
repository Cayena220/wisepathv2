import { Award, ClipboardCheck, GraduationCap, Plus, Target, Trophy, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { ActivityFeed } from '@/components/data/ActivityFeed';
import { WeeklyChart } from '@/components/data/charts';
import { BarList, PageHeader, SectionTitle, StatCard } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { usePrograms, useProgramAssessments } from '@/lib/data/catalog';
import { useDepartmentStats } from '@/lib/data/results';
import { percent } from '@/lib/utils';

export function DashboardPage() {
  const { actor, department } = useAuth();
  const navigate = useNavigate();
  const deptId = actor?.departmentId ?? null;
  const programs = usePrograms(deptId);
  const active = (programs.data ?? []).filter((p) => p.status === 'active');
  const assessments = useProgramAssessments(deptId);
  const stats = useDepartmentStats(deptId, active.map((p) => p.id));
  const s = stats.data;
  const programsWithoutAssessment = active.filter((p) => !(assessments.data ?? []).some((a) => a.programId === p.id && a.status === 'active'));

  return (
    <>
      <PageHeader
        eyebrow={department?.name}
        title={`Welcome back, ${actor?.name.split(' ')[0] ?? ''}`}
        description="How students are matching to your department’s programs. Every number and bar opens the students behind it."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/program-assessments/new">
                <ClipboardCheck /> New assessment
              </Link>
            </Button>
            <Button asChild>
              <Link to="/programs/new">
                <Plus /> New program
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students matched"
          value={s?.matchedStudents ?? 0}
          loading={stats.isLoading}
          icon={Users}
          to="/results?view=latest"
          hint="Latest top-3 includes one of your programs"
        />
        <StatCard
          label="Best match in your department"
          value={s?.bestMatchStudents ?? 0}
          loading={stats.isLoading}
          icon={Award}
          tone="gold"
          to="/results?view=best"
          hint={`${percent(s?.bestMatchStudents ?? 0, s?.matchedStudents ?? 0)}% of matched students`}
        />
        <StatCard label="Assessments · 30 days" value={s?.results30d ?? 0} loading={stats.isLoading} icon={Trophy} tone="teal" to="/results?since=30" />
        <StatCard
          label="Program fit rate"
          value={`${percent(s?.fitAttempts ?? 0, s?.attempts ?? 0)}%`}
          loading={stats.isLoading}
          icon={Target}
          tone="teal"
          to="/results?tab=attempts"
          hint={`${s?.fitAttempts ?? 0} fit of ${s?.attempts ?? 0} fit checks`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Course results</CardTitle>
            <CardDescription>Students whose latest top match is each program. Click a program to see those students.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading || programs.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <BarList
                items={active
                  .map((p) => ({
                    id: p.id,
                    label: p.title,
                    sublabel: p.code,
                    value: s?.programCounts[p.id] ?? 0,
                    color: department?.color,
                    to: `/programs/${p.id}?tab=students`,
                  }))
                  .sort((a, b) => b.value - a.value)}
                emptyText="Add a program to start matching students."
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <SectionTitle action={<Link to="/results" className="text-[13px] font-medium text-teal-700 hover:underline">All results</Link>}>
              Recent activity
            </SectionTitle>
          </CardHeader>
          <ActivityFeed departmentId={deptId} isSuperAdmin={false} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Assessments per week</CardTitle>
            <CardDescription>Career assessments that included your programs in the top 3. Click a week to open it.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? <Skeleton className="h-56" /> : <WeeklyChart data={s?.weekly ?? []} onSelect={(w) => navigate(`/results?from=${w.start}&to=${w.end}`)} />}
          </CardContent>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-navy-900">
            <GraduationCap className="size-4 text-gold-700" /> Department checklist
          </div>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2">
              <span className="text-navy-700">Active programs</span>
              <Link to="/programs" className="font-semibold text-teal-700 hover:underline">{active.length}</Link>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2">
              <span className="text-navy-700">Programs without a fit check</span>
              <Link to="/program-assessments" className={`font-semibold hover:underline ${programsWithoutAssessment.length ? 'text-rust-600' : 'text-teal-700'}`}>
                {programsWithoutAssessment.length}
              </Link>
            </li>
            {programsWithoutAssessment.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link to={`/program-assessments/new?program=${p.id}`} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-navy-600 hover:bg-gold-50">
                  <span className="truncate">+ Fit check for {p.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
