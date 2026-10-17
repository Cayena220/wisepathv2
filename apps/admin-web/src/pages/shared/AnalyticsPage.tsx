import { formatDate } from '@wisepath/shared';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Download, RefreshCw, Users } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { useSegmentDialog } from '@/components/analytics/SegmentDialog';
import {
  AnswerProfileCard,
  DepartmentFunnelCard,
  DepartmentTableCard,
  FitChecksCard,
  InterestsCard,
  MatchStrengthCard,
  ProgramTableCard,
  ScoreBandsCard,
  StrandCard,
  StudentMixCard,
  SuperFunnelCard,
  TrendCard,
} from '@/components/analytics/widgets';
import { pct } from '@/components/analytics/charts';
import { EmptyState, ErrorState, PageHeader, StatCard } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/overlays';
import { Card, NativeSelect, Skeleton } from '@/components/ui/primitives';
import { SAMPLE_LIMIT, useAnalyticsSample } from '@/lib/data/analytics';
import { useDepartments, usePrograms } from '@/lib/data/catalog';
import { downloadCsv } from '@/lib/csv';

export function AnalyticsPage() {
  const { isSuperAdmin, actor, department } = useAuth();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const { departments, byId } = useDepartments();
  const scope = isSuperAdmin ? params.get('department') : actor?.departmentId ?? null;
  const scopeDept = scope ? byId.get(scope) : undefined;
  const sample = useAnalyticsSample(scope);
  const programs = usePrograms(scope);
  const { open, dialog } = useSegmentDialog(sample.data?.results, sample.data?.attempts);

  const data = sample.data;
  const stats = data?.resultStats;
  const attempts = data?.attemptStats;

  const exportResults = () => {
    if (!data) return;
    downloadCsv(
      `wisepath-results-${scopeDept?.code ?? 'all'}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Student', 'Email', 'Strand', 'Status', 'Residence', 'Career interests', 'Top match', 'Top match %', '2nd match', '3rd match', 'Departments in top 3', 'Taken'],
      data.results.map((r) => [
        r.studentSnapshot?.name,
        r.studentSnapshot?.email,
        r.studentSnapshot?.shsStrand,
        r.studentSnapshot?.studentStatus,
        r.studentSnapshot?.residenceType,
        (r.studentSnapshot?.careerInterests ?? []).join('; '),
        r.top3?.[0]?.programTitle,
        r.bestMatchPercent,
        r.top3?.[1] ? `${r.top3[1].programTitle} (${r.top3[1].matchPercent}%)` : '',
        r.top3?.[2] ? `${r.top3[2].programTitle} (${r.top3[2].matchPercent}%)` : '',
        (r.topDepartmentIds ?? []).map((d) => byId.get(d)?.code ?? d).join('; '),
        formatDate(r.completedAt, true),
      ]),
    );
  };

  const exportAttempts = () => {
    if (!data) return;
    downloadCsv(
      `wisepath-fit-checks-${scopeDept?.code ?? 'all'}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Student', 'Email', 'Assessment', 'Program', 'Score %', 'Pass mark %', 'Result', 'Taken'],
      data.attempts.map((a) => [a.studentName, a.studentEmail, a.assessmentTitle, a.programTitle, a.scorePercent, a.passingPercent, a.isFit ? 'Fit' : 'Not yet', formatDate(a.completedAt, true)]),
    );
  };

  return (
    <>
      <PageHeader
        eyebrow={isSuperAdmin ? (scopeDept ? scopeDept.name : 'All departments') : department?.name}
        title="Analytics"
        description={
          isSuperAdmin
            ? 'Who your students are, how clearly they match, and how fit checks perform. Every bar opens the students behind it.'
            : 'Students matched to your department’s programs: who they are, how clearly they match, and how your fit checks perform. Every bar opens the students behind it.'
        }
        actions={
          <>
            {isSuperAdmin && (
              <div className="w-60">
                <NativeSelect value={scope ?? ''} onChange={(e) => setParams(e.target.value ? { department: e.target.value } : {}, { replace: true })} aria-label="Department">
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                void client.invalidateQueries({ queryKey: ['analyticsSample'] });
                void client.invalidateQueries({ queryKey: ['weeklyTrends'] });
                void client.invalidateQueries({ queryKey: ['studentFunnel'] });
              }}
              loading={sample.isFetching}
            >
              <RefreshCw /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={!data}>
                  <Download /> Export CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportResults}>Career results ({data?.results.length ?? 0})</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportAttempts}>Fit checks ({data?.attempts.length ?? 0})</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {sample.error ? (
        <ErrorState error={sample.error} />
      ) : sample.isLoading || !stats || !attempts ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={i < 4 ? 'h-32 rounded-xl' : 'h-64 rounded-xl md:col-span-2'} />
          ))}
        </div>
      ) : !stats.total && !attempts.total ? (
        <Card>
          <EmptyState icon={BarChart3} title="No results to analyze yet" description="Analytics appear once students take the career assessment on Android." />
        </Card>
      ) : (
        <div className="space-y-6" style={{ opacity: sample.isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <p className="text-xs text-navy-600">
            Based on the latest result of {stats.total.toLocaleString('en-US')} student{stats.total === 1 ? '' : 's'}
            {data.resultsCapped ? ` (the ${SAMPLE_LIMIT} most recent)` : ''} and {attempts.total.toLocaleString('en-US')} fit check
            {attempts.total === 1 ? '' : 's'}
            {data.attemptsCapped ? ` (the ${SAMPLE_LIMIT} most recent)` : ''} · updated {new Date(data.fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students analyzed" value={stats.total.toLocaleString('en-US')} icon={Users} hint={scope ? 'Latest top 3 includes the department' : 'Latest result of each student'} />
            <StatCard
              label={scope ? 'Best match in the department' : 'Average top-match share'}
              value={scope ? stats.bestHere.toLocaleString('en-US') : `${stats.avgBestMatch}%`}
              tone="gold"
              hint={scope ? `${pct(stats.total ? stats.bestHere / stats.total : 0)} of matched students` : 'Higher = clearer recommendations'}
            />
            <StatCard label="Fit check pass rate" value={pct(attempts.fitRate)} tone="teal" hint={`${attempts.fit} of ${attempts.total} attempts passed`} />
            <StatCard label="Shared family income" value={pct(stats.affordabilityShare)} tone="navy" hint="Affordability was part of their match" />
          </div>

          {isSuperAdmin && !scope ? (
            <SuperFunnelCard />
          ) : (
            <DepartmentFunnelCard stats={stats} attempts={attempts} resultIds={data.results.map((r) => r.id)} open={open} />
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <MatchStrengthCard stats={stats} open={open} />
            <AnswerProfileCard stats={stats} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <StrandCard stats={stats} open={open} />
            <InterestsCard stats={stats} open={open} />
          </div>

          <StudentMixCard stats={stats} open={open} />

          {scope ? (
            <ProgramTableCard stats={stats} attempts={attempts} programs={programs.data ?? []} />
          ) : (
            <DepartmentTableCard stats={stats} attempts={attempts} departments={departments} />
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <FitChecksCard attempts={attempts} open={open} />
            <ScoreBandsCard attempts={attempts} open={open} />
          </div>

          <TrendCard departmentId={scope} isSuperAdmin={isSuperAdmin} />
        </div>
      )}
      {dialog}
    </>
  );
}
