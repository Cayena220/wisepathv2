import {
  MATCH_BANDS,
  type AttemptAnalytics,
  type Department,
  type Program,
  type QuestionStat,
  type ResultAnalytics,
} from '@wisepath/shared';
import { useNavigate } from 'react-router';
import { DeptDot, useRowLink } from '@/components/data/display';
import { Skeleton, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { useStudentFunnel, useWeeklyTrends } from '@/lib/data/analytics';
import { ChartCard, ColumnChart, Funnel, HBarChart, NoData, ShareBar, TrendChart, pct } from './charts';
import type { SegmentRequest } from './SegmentDialog';

type Open = (request: SegmentRequest) => void;

const countLabel = (count: number, share: number) => `${count} · ${pct(share)}`;

// ---------------------------------------------------------------- funnel

export function SuperFunnelCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useStudentFunnel(true);
  return (
    <ChartCard
      className={className}
      title="Student journey"
      description="How far students get in WisePath. The column on the right is the share that continued from the step before. Click a step to open it."
      table={data ? { columns: ['Step', 'Students', 'From previous step'], rows: data.map((s, i) => [s.label, s.value, i ? pct(data[i - 1].value ? s.value / data[i - 1].value : 0) : '—']) } : undefined}
    >
      {isLoading || !data ? <Skeleton className="h-44" /> : <Funnel steps={data} onSelect={(s) => navigate(data.find((d) => d.key === s.key)!.to)} />}
    </ChartCard>
  );
}

export function DepartmentFunnelCard({
  stats,
  attempts,
  resultIds,
  open,
  className,
}: {
  stats: ResultAnalytics;
  attempts: AttemptAnalytics;
  resultIds: string[];
  open: Open;
  className?: string;
}) {
  const steps = [
    { key: 'matched', label: 'Matched to your programs', hint: 'Latest top 3 includes one of your programs', value: stats.total },
    { key: 'best', label: 'Best match is yours', hint: 'Their #1 program is in your department', value: stats.bestHere },
    { key: 'fit', label: 'Took one of your fit checks', hint: 'Distinct students', value: attempts.students },
    { key: 'passed', label: 'Passed a fit check', hint: 'Scored at or above the pass mark', value: attempts.fitStudents },
  ];
  return (
    <ChartCard
      className={className}
      title="Student journey"
      description="From matching to passing a fit check. The column on the right is the share that continued from the step before. Click a step to see the students."
      table={{ columns: ['Step', 'Students', 'From previous step'], rows: steps.map((s, i) => [s.label, s.value, i ? pct(steps[i - 1].value ? s.value / steps[i - 1].value : 0) : '—']) }}
    >
      <Funnel
        steps={steps}
        onSelect={(s) => {
          if (s.key === 'matched') open({ title: 'Matched to your programs', kind: 'results', ids: resultIds });
          if (s.key === 'best') open({ title: 'Best match is in your department', kind: 'results', ids: stats.bestHereIds });
          if (s.key === 'fit') open({ title: 'Fit checks taken', kind: 'attempts', ids: attempts.byAssessment.flatMap((a) => a.ids) });
          if (s.key === 'passed') open({ title: 'Passed fit checks', kind: 'attempts', ids: attempts.byAssessment.flatMap((a) => a.fitIds) });
        }}
      />
    </ChartCard>
  );
}

// ---------------------------------------------------------------- match strength

export function MatchStrengthCard({ stats, open, className }: { stats: ResultAnalytics; open: Open; className?: string }) {
  const data = stats.matchStrength.map((s, i) => ({ key: s.key, label: s.label, value: s.count, detail: MATCH_BANDS[i].hint }));
  return (
    <ChartCard
      className={className}
      title="How clear the top match is"
      description="The top program’s share of the top-3 total. Near 33% means the top three are tied; higher means one program clearly stands out."
      table={{ columns: ['Top-match share', 'Meaning', 'Students', 'Share'], rows: stats.matchStrength.map((s, i) => [s.label, MATCH_BANDS[i].hint, s.count, pct(s.share)]) }}
      footnote={`Average top-match share: ${stats.avgBestMatch}%`}
    >
      <ColumnChart
        data={data}
        onSelect={(d) => {
          const seg = stats.matchStrength.find((s) => s.key === d.key)!;
          open({ title: `Top match ${seg.label}`, description: `${MATCH_BANDS.find((b) => b.key === d.key)?.hint}. ${seg.count} students.`, kind: 'results', ids: seg.ids });
        }}
      />
    </ChartCard>
  );
}

// ---------------------------------------------------------------- answer profile

export function AnswerProfileCard({ stats, className }: { stats: ResultAnalytics; className?: string }) {
  return (
    <ChartCard
      className={className}
      title="What students lean toward"
      description="Average career-assessment points per dimension."
      table={{ columns: ['Dimension', 'Average points'], rows: stats.dimensions.map((d) => [d.label, d.average]) }}
    >
      {stats.total ? <HBarChart data={stats.dimensions.map((d) => ({ key: d.id, label: d.label, value: d.average, valueLabel: d.average.toFixed(1) }))} /> : <NoData />}
    </ChartCard>
  );
}

// ---------------------------------------------------------------- strands & interests

export function StrandCard({ stats, open, className }: { stats: ResultAnalytics; open: Open; className?: string }) {
  return (
    <ChartCard
      className={className}
      title="Senior high strand"
      description="Strand of each matched student. Click a strand to see who."
      table={{ columns: ['Strand', 'Students', 'Share'], rows: stats.strands.map((s) => [s.label, s.count, pct(s.share)]) }}
    >
      <HBarChart
        data={stats.strands.map((s) => ({ key: s.key, label: s.label, value: s.count, valueLabel: countLabel(s.count, s.share) }))}
        onSelect={(d) => {
          const seg = stats.strands.find((s) => s.key === d.key)!;
          open({ title: `${seg.label} students`, kind: 'results', ids: seg.ids });
        }}
        labelWidth="30%"
      />
    </ChartCard>
  );
}

export function InterestsCard({ stats, open, limit, className }: { stats: ResultAnalytics; open: Open; limit?: number; className?: string }) {
  const rows = limit ? stats.interests.slice(0, limit) : stats.interests;
  return (
    <ChartCard
      className={className}
      title="Career interests"
      description="Share of students who picked each interest (students can pick several)."
      table={{ columns: ['Interest', 'Students', 'Share of students'], rows: stats.interests.map((s) => [s.label, s.count, pct(s.share)]) }}
    >
      <HBarChart
        data={rows.map((s) => ({ key: s.key, label: s.label, value: s.count, valueLabel: countLabel(s.count, s.share) }))}
        onSelect={(d) => {
          const seg = stats.interests.find((s) => s.key === d.key)!;
          open({ title: `Interested in ${seg.label}`, kind: 'results', ids: seg.ids });
        }}
        labelWidth="44%"
      />
    </ChartCard>
  );
}

// ---------------------------------------------------------------- student mix (part-to-whole)

export function StudentMixCard({ stats, open, className }: { stats: ResultAnalytics; open: Open; className?: string }) {
  const groups = [
    { title: 'Study status', segments: stats.studentStatus },
    { title: 'Residence', segments: stats.residence },
    { title: 'Learning style', segments: stats.learningStyle },
    { title: 'Skill level', segments: stats.skillLevel },
  ];
  return (
    <ChartCard
      className={className}
      title="Student profile mix"
      description={`Who the matched students are. ${pct(stats.affordabilityShare)} shared their family income, so affordability was part of their match.`}
      table={{ columns: ['Group', 'Answer', 'Students', 'Share'], rows: groups.flatMap((g) => g.segments.map((s) => [g.title, s.label, s.count, pct(s.share)])) }}
    >
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-[13px] font-semibold text-navy-900">{g.title}</div>
            <ShareBar
              data={g.segments.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
              onSelect={(d) => {
                const seg = g.segments.find((s) => s.key === d.key)!;
                open({ title: `${g.title}: ${seg.label}`, kind: 'results', ids: seg.ids });
              }}
            />
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------- programs (department) / departments (super)

export function ProgramTableCard({
  stats,
  attempts,
  programs,
  className,
}: {
  stats: ResultAnalytics;
  attempts: AttemptAnalytics;
  programs: Program[];
  className?: string;
}) {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const byId = new Map(stats.programs.map((p) => [p.programId, p]));
  const rows = programs
    .filter((p) => p.status === 'active')
    .map((p) => {
      const s = byId.get(p.id);
      const fit = attempts.byProgram.get(p.id);
      return { program: p, top3: s?.top3Count ?? 0, best: s?.bestCount ?? 0, avgMatch: s?.avgMatch ?? 0, fitChecks: fit?.attempts ?? 0, fitRate: fit?.attempts ? fit.fit / fit.attempts : null };
    })
    .sort((a, b) => b.best - a.best || b.top3 - a.top3);
  return (
    <ChartCard className={className} title="Program comparison" description="How each of your programs is doing. Click a program to see its students.">
      <div className="-mx-1 overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH>Program</TH>
              <TH className="text-right">Best match</TH>
              <TH className="text-right">In top 3</TH>
              <TH className="text-right">Avg match</TH>
              <TH className="text-right">Fit checks</TH>
              <TH className="text-right">Fit rate</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.program.id} {...rowLink(() => navigate(`/programs/${r.program.id}?tab=students`))}>
                <TD>
                  <div className="font-medium text-navy-900">{r.program.code}</div>
                  <div className="max-w-64 truncate text-xs text-navy-600">{r.program.title}</div>
                </TD>
                <TD className="tabular text-right font-semibold">{r.best}</TD>
                <TD className="tabular text-right">{r.top3}</TD>
                <TD className="tabular text-right">{r.top3 ? `${r.avgMatch}%` : '—'}</TD>
                <TD className="tabular text-right">{r.fitChecks}</TD>
                <TD className="tabular text-right">{r.fitRate == null ? '—' : pct(r.fitRate)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </ChartCard>
  );
}

export function DepartmentTableCard({
  stats,
  attempts,
  departments,
  className,
}: {
  stats: ResultAnalytics;
  attempts: AttemptAnalytics;
  departments: Department[];
  className?: string;
}) {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const byId = new Map(stats.departments.map((d) => [d.departmentId, d]));
  const fitByDept = new Map<string, { attempts: number; fit: number }>();
  for (const a of attempts.byAssessment) {
    const cur = fitByDept.get(a.departmentId) ?? { attempts: 0, fit: 0 };
    fitByDept.set(a.departmentId, { attempts: cur.attempts + a.attempts, fit: cur.fit + a.fit });
  }
  const rows = departments
    .filter((d) => d.status === 'active')
    .map((d) => {
      const s = byId.get(d.id);
      const fit = fitByDept.get(d.id);
      return { dept: d, best: s?.bestCount ?? 0, top3: s?.top3Count ?? 0, avg: s?.avgBestMatch ?? 0, fitChecks: fit?.attempts ?? 0, fitRate: fit?.attempts ? fit.fit / fit.attempts : null };
    })
    .sort((a, b) => b.best - a.best);
  return (
    <ChartCard className={className} title="Department comparison" description="Best matches, top-3 appearances and fit checks per department. Click a department to open it.">
      <div className="-mx-1 overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH>Department</TH>
              <TH className="text-right">Best match</TH>
              <TH className="text-right">In top 3</TH>
              <TH className="text-right">Avg top match</TH>
              <TH className="text-right">Fit checks</TH>
              <TH className="text-right">Fit rate</TH>
              <TH>Admin</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.dept.id} {...rowLink(() => navigate(`/departments/${r.dept.id}`))}>
                <TD>
                  <div className="flex items-center gap-2 font-medium text-navy-900">
                    <DeptDot color={r.dept.color} /> {r.dept.code}
                  </div>
                  <div className="max-w-56 truncate text-xs text-navy-600">{r.dept.name}</div>
                </TD>
                <TD className="tabular text-right font-semibold">{r.best}</TD>
                <TD className="tabular text-right">{r.top3}</TD>
                <TD className="tabular text-right">{r.best ? `${r.avg}%` : '—'}</TD>
                <TD className="tabular text-right">{r.fitChecks}</TD>
                <TD className="tabular text-right">{r.fitRate == null ? '—' : pct(r.fitRate)}</TD>
                <TD className="text-[13px]">{r.dept.adminName ?? <span className="text-rust-600">None</span>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------- fit checks

export function FitChecksCard({ attempts, open, className }: { attempts: AttemptAnalytics; open: Open; className?: string }) {
  return (
    <ChartCard
      className={className}
      title="Fit check pass rate"
      description="Share of attempts that reached the pass mark, per program assessment. Click one to see the attempts."
      table={{ columns: ['Assessment', 'Program', 'Attempts', 'Passed', 'Pass rate', 'Average score'], rows: attempts.byAssessment.map((a) => [a.assessmentTitle, a.programTitle, a.attempts, a.fit, pct(a.fitRate), `${a.avgScore}%`]) }}
      footnote={attempts.total ? `${attempts.total} attempts by ${attempts.students} students · average score ${attempts.avgScore}%` : undefined}
    >
      <HBarChart
        data={attempts.byAssessment.map((a) => ({ key: a.assessmentId, label: a.assessmentTitle, value: Math.round(a.fitRate * 100), valueLabel: `${pct(a.fitRate)} of ${a.attempts}`, detail: `Average score ${a.avgScore}%` }))}
        max={100}
        onSelect={(d) => {
          const a = attempts.byAssessment.find((x) => x.assessmentId === d.key)!;
          open({ title: a.assessmentTitle, description: `${a.fit} of ${a.attempts} attempts passed.`, kind: 'attempts', ids: a.ids });
        }}
        labelWidth="42%"
      />
    </ChartCard>
  );
}

export function ScoreBandsCard({ attempts, open, className }: { attempts: AttemptAnalytics; open: Open; className?: string }) {
  return (
    <ChartCard
      className={className}
      title="Fit check scores"
      description="How attempts are spread across score bands. The usual pass mark is 75%."
      table={{ columns: ['Score', 'Attempts', 'Share'], rows: attempts.scoreBands.map((b) => [b.label, b.count, pct(b.share)]) }}
    >
      <ColumnChart
        data={attempts.scoreBands.map((b) => ({ key: b.key, label: b.label, value: b.count }))}
        onSelect={(d) => {
          const b = attempts.scoreBands.find((x) => x.key === d.key)!;
          open({ title: `Fit checks scoring ${b.label}`, kind: 'attempts', ids: b.ids });
        }}
      />
    </ChartCard>
  );
}

// ---------------------------------------------------------------- weekly trend

export function TrendCard({ departmentId, isSuperAdmin, className }: { departmentId: string | null; isSuperAdmin: boolean; className?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useWeeklyTrends(departmentId, isSuperAdmin);
  const series = [
    { key: 'assessments', label: departmentId ? 'Career assessments that include the department' : 'Career assessments' },
    { key: 'second', label: isSuperAdmin && !departmentId ? 'New student accounts' : 'Fit checks taken' },
  ];
  return (
    <ChartCard
      className={className}
      title="Activity per week"
      description="Last 8 weeks. Click a week to open its career results."
      table={data ? { columns: ['Week of', series[0].label, series[1].label], rows: data.map((w) => [w.label, Number(w.assessments), Number(w.second)]) } : undefined}
    >
      {isLoading || !data ? (
        <Skeleton className="h-60" />
      ) : (
        <TrendChart data={data} series={series} onSelect={(w) => navigate(`/results?from=${w.start}&to=${w.end}${departmentId && isSuperAdmin ? `&department=${departmentId}` : ''}`)} />
      )}
    </ChartCard>
  );
}

// ---------------------------------------------------------------- per-question analysis (program assessment page)

export function QuestionAnalysisCard({ questions, attempts, className }: { questions: QuestionStat[]; attempts: number; className?: string }) {
  const answered = questions.filter((q) => q.responses > 0);
  const hardest = answered.length ? answered.reduce((a, b) => (b.bestShare < a.bestShare ? b : a)) : null;
  return (
    <ChartCard
      className={className}
      title="Question analysis"
      description={
        attempts
          ? `How ${attempts} attempt${attempts === 1 ? '' : 's'} answered each question. Questions few students get right may need clearer wording, or show a real gap.`
          : 'Appears once students take this fit check.'
      }
      table={{
        columns: ['Question', 'Answers', 'Picked the best answer', 'Average points'],
        rows: questions.map((q, i) => [`${i + 1}. ${q.text}`, q.responses, pct(q.bestShare), pct(q.avgScoreShare)]),
      }}
    >
      {!attempts ? (
        <NoData text="No attempts yet." />
      ) : (
        <ol className="space-y-5">
          {questions.map((q, i) => (
            <li key={q.questionId}>
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13.5px] font-medium text-navy-900">
                  {i + 1}. {q.text}
                </div>
                {hardest?.questionId === q.questionId && answered.length > 1 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-600/25">
                    ⚠ Hardest
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-navy-600">
                {pct(q.bestShare)} picked the best answer · {q.responses} answer{q.responses === 1 ? '' : 's'}
              </div>
              <div className="mt-2">
                <HBarChart
                  data={q.options.map((o) => ({
                    key: o.optionId,
                    label: `${o.isBest ? '★ ' : ''}${o.text}`,
                    value: o.count,
                    valueLabel: `${o.count} · ${pct(o.share)}`,
                    detail: `${o.points} points${o.isBest ? ' (best answer)' : ''}`,
                  }))}
                  max={Math.max(1, q.responses)}
                  labelWidth="52%"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
