import { DIMENSION_LABELS, DIMENSIONS, formatDate, type DimensionId } from '@wisepath/shared';
import { ArrowRight, Info, MessageSquareQuote, Sparkles, User } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, ErrorState, MatchPill, PageHeader, SectionTitle } from '@/components/data/display';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { useDepartments } from '@/lib/data/catalog';
import { useCareerResult } from '@/lib/data/results';
import { cn } from '@/lib/utils';

export function ResultDetailPage() {
  const { resultId } = useParams();
  const { actor, isSuperAdmin } = useAuth();
  const { byId } = useDepartments();
  const { data: result, isLoading, error } = useCareerResult(resultId);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !result) return <ErrorState error={error ?? new Error('Result not found, or it belongs to another department.')} />;

  const snap = result.studentSnapshot;
  const myDept = actor?.departmentId;
  const maxScore = Math.max(1, ...result.rankings.map((r) => r.score));
  const maxDim = Math.max(1, ...DIMENSIONS.map((d) => result.dimensionScores?.[d] ?? 0));

  return (
    <>
      <PageHeader
        eyebrow={`Career assessment · ${formatDate(result.completedAt, true)}`}
        title={snap?.name || 'Student result'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {snap?.email}
            {result.isLatest ? <Badge tone="teal">Latest result</Badge> : <Badge>Earlier attempt</Badge>}
            {result.scoringVersion === 1 && <Badge tone="amber">Migrated from v1</Badge>}
          </span>
        }
        actions={
          <Link
            to={`/students/${result.userId}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-white px-4 text-sm font-medium text-navy-900 shadow-xs transition hover:border-gold-300 hover:bg-gold-50"
          >
            <User className="size-4" /> Student profile <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {result.top3.map((row, index) => {
          const dept = byId.get(row.departmentId);
          const mine = row.departmentId === myDept;
          return (
            <Link
              key={row.programId}
              to={`/programs/${row.programId}`}
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
                index === 0 && 'border-gold-500/40 ring-1 ring-gold-500/20',
              )}
            >
              {index === 0 && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 to-teal-600" />}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-navy-600 uppercase">{['Top match', '2nd match', '3rd match'][index]}</span>
                <MatchPill value={row.matchPercent} />
              </div>
              <div className="mt-3 line-clamp-2 font-semibold leading-snug text-navy-900">{row.programTitle}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-navy-600">
                <DeptDot color={dept?.color} /> {dept?.name ?? row.departmentId}
                {mine && <Badge tone="gold" className="ml-1">Your department</Badge>}
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                Open program <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Full ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.rankings.map((row, index) => {
                const dept = byId.get(row.departmentId);
                const mine = row.departmentId === myDept;
                return (
                  <li key={row.programId}>
                    <Link to={`/programs/${row.programId}`} className={cn('group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gold-50', mine && 'bg-gold-50/60')}>
                      <span className="tabular w-6 text-right text-xs font-semibold text-navy-400">{index + 1}</span>
                      <div className="relative min-w-0 flex-1">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{ width: `${Math.max(2, (row.score / maxScore) * 100)}%`, background: dept?.color ?? '#8D9BAE', opacity: mine || isSuperAdmin ? 0.2 : 0.1 }}
                        />
                        <div className="relative truncate py-1 pl-2 text-[13px] text-navy-900">{row.programTitle}</div>
                      </div>
                      <span className="tabular w-12 text-right text-[13px] font-semibold text-navy-900">{row.matchPercent}%</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-navy-600">
              <Info className="mt-0.5 size-3.5 shrink-0" /> Match % is each program’s share of the top-3 total, so the top three add up to about 100%. It is not a probability of success.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-700" /> Strengths & guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="flex flex-wrap gap-2">
                {result.strengths.map((s) => (
                  <li key={s} className="rounded-full bg-teal-50 px-3 py-1 text-[13px] text-teal-700 ring-1 ring-teal-600/15">
                    {s}
                  </li>
                ))}
              </ul>
              {result.guidanceSummary && (
                <blockquote className="flex gap-2 rounded-xl bg-surface/70 p-3 text-[13px] leading-relaxed text-navy-700">
                  <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-gold-700" />
                  {result.guidanceSummary}
                </blockquote>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Answer profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DIMENSIONS.map((d: DimensionId) => (
                <div key={d}>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-navy-700">{DIMENSION_LABELS[d]}</span>
                    <span className="tabular font-semibold text-navy-900">{result.dimensionScores?.[d] ?? 0}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-navy-50">
                    <div className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-gold-500" style={{ width: `${((result.dimensionScores?.[d] ?? 0) / maxDim) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle>Answers ({result.answers.length})</SectionTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {result.answers.map((a, i) => (
                <li key={a.questionId} className="rounded-xl border p-3">
                  <div className="text-xs text-navy-600">
                    Q{i + 1} · {a.scope === 'system' ? 'Core question' : `${byId.get(a.departmentId ?? '')?.code ?? 'Department'} question`}
                  </div>
                  <div className="mt-0.5 text-[13px] font-medium text-navy-900">{a.questionText}</div>
                  <div className="mt-1.5 text-[13px] text-teal-700">→ {a.optionText}</div>
                </li>
              ))}
              {!result.answers.length && <li className="text-sm text-navy-600">Answers were not recorded for this attempt.</li>}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionTitle>Profile at the time</SectionTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
              {[
                ['Status', snap?.studentStatus === 'current' ? 'Current college student' : snap?.studentStatus === 'incoming' ? 'Incoming college student' : '—'],
                ['SHS strand', snap?.shsStrand || '—'],
                ['Academic average', snap?.academicAverage || '—'],
                ['Residence', snap?.residenceType || '—'],
                ['Skill level', snap?.currentSkills || '—'],
                ['Learning style', snap?.learningStyle || '—'],
                ['Affordability used', snap?.affordabilityConsidered ? 'Yes (income shared)' : 'No'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-navy-600">{label}</dt>
                  <dd className="font-medium text-navy-900">{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-navy-600">Career interests</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {(snap?.careerInterests ?? []).map((i) => (
                    <Badge key={i} tone="gold">{i}</Badge>
                  ))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-navy-600">Learning goals</dt>
                <dd className="mt-1 space-y-0.5 text-navy-900">
                  {(snap?.learningGoals ?? []).map((g) => (
                    <div key={g}>• {g}</div>
                  ))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
