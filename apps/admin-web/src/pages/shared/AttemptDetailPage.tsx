import { formatDate } from '@wisepath/shared';
import { ArrowRight, CheckCircle2, CircleDashed, User } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ErrorState, FitBadge, PageHeader } from '@/components/data/display';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { useAttempt } from '@/lib/data/results';
import { cn } from '@/lib/utils';

export function AttemptDetailPage() {
  const { attemptId } = useParams();
  const { data: attempt, isLoading, error } = useAttempt(attemptId);
  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !attempt) return <ErrorState error={error ?? new Error('Attempt not found, or it belongs to another department.')} />;

  const earned = attempt.answers.reduce((s, a) => s + a.points, 0);
  const max = attempt.answers.reduce((s, a) => s + a.maxPoints, 0);

  return (
    <>
      <PageHeader
        eyebrow={`Program fit check · ${formatDate(attempt.completedAt, true)}`}
        title={attempt.studentName}
        description={attempt.studentEmail}
        actions={
          <Link
            to={`/students/${attempt.userId}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-white px-4 text-sm font-medium text-navy-900 shadow-xs hover:bg-gold-50"
          >
            <User className="size-4" /> Student profile
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-5 p-5">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E4E8EE" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={attempt.isFit ? '#3E7A6C' : '#C2872E'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${(attempt.scorePercent / 100) * 97.4} 97.4`}
              />
            </svg>
            <div className="tabular absolute inset-0 flex items-center justify-center text-xl font-bold text-navy-900">{attempt.scorePercent}%</div>
          </div>
          <div>
            <FitBadge isFit={attempt.isFit} />
            <div className="mt-2 text-[13px] text-navy-600">
              {earned} of {max} points · pass mark {attempt.passingPercent}%
            </div>
          </div>
        </Card>
        <Link to={`/program-assessments/${attempt.assessmentId}`} className="group rounded-xl border bg-white p-5 shadow-[var(--shadow-card)] transition hover:bg-gold-50/60">
          <div className="text-[13px] text-navy-600">Assessment</div>
          <div className="mt-1 font-semibold text-navy-900">{attempt.assessmentTitle}</div>
          <div className="mt-1 text-xs text-navy-600">Version {attempt.assessmentVersion}</div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
            Open assessment <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link to={`/programs/${attempt.programId}`} className="group rounded-xl border bg-white p-5 shadow-[var(--shadow-card)] transition hover:bg-gold-50/60">
          <div className="text-[13px] text-navy-600">Program</div>
          <div className="mt-1 font-semibold text-navy-900">{attempt.programTitle}</div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
            Open program <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {attempt.answers.map((a, i) => {
              const best = a.points >= a.maxPoints;
              return (
                <li key={a.questionId} className="flex gap-3 rounded-xl border p-3.5">
                  {best ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal-600" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-gold-500" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-navy-900">
                      {i + 1}. {a.questionText}
                    </div>
                    <div className="mt-1 text-[13px] text-navy-700">→ {a.optionText}</div>
                  </div>
                  <div className={cn('tabular shrink-0 text-sm font-semibold', best ? 'text-teal-700' : 'text-gold-700')}>
                    {a.points}/{a.maxPoints}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
