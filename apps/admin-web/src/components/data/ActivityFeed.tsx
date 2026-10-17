import { timeAgo } from '@wisepath/shared';
import { ClipboardCheck, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { useRecentActivity } from '@/lib/data/results';
import { EmptyState, ErrorState, FitBadge, ListSkeleton, MatchPill } from './display';

/** Latest career results and fit attempts. Every row links to its detail page. */
export function ActivityFeed({ departmentId, isSuperAdmin }: { departmentId: string | null; isSuperAdmin: boolean }) {
  const { data, isLoading, error } = useRecentActivity(departmentId, isSuperAdmin);
  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) return <ErrorState error={error} />;
  if (!data?.length) return <EmptyState title="No activity yet" description="Results appear here as students take assessments." compact />;
  return (
    <ul className="divide-y">
      {data.map((item) =>
        item.kind === 'result' ? (
          <li key={`r-${item.result.id}`}>
            <Link to={`/results/${item.result.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-gold-50/70">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Trophy className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-navy-900">{item.result.studentSnapshot?.name || 'Student'}</div>
                <div className="truncate text-xs text-navy-600">
                  Career assessment · top match {item.result.top3?.[0]?.programTitle ?? '—'}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <MatchPill value={item.result.bestMatchPercent} />
                <span className="text-[11px] text-navy-400">{timeAgo(item.result.completedAt)}</span>
              </div>
            </Link>
          </li>
        ) : (
          <li key={`a-${item.attempt.id}`}>
            <Link to={`/attempts/${item.attempt.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-gold-50/70">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                <ClipboardCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-navy-900">{item.attempt.studentName || 'Student'}</div>
                <div className="truncate text-xs text-navy-600">Fit check · {item.attempt.programTitle}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <FitBadge isFit={item.attempt.isFit} score={item.attempt.scorePercent} />
                <span className="text-[11px] text-navy-400">{timeAgo(item.attempt.completedAt)}</span>
              </div>
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
