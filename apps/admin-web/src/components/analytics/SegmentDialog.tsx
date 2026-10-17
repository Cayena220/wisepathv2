import { formatDate, type CareerResult, type ProgramAssessmentAttempt } from '@wisepath/shared';
import { ChevronRight, Users } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { EmptyState, FitBadge, MatchPill } from '@/components/data/display';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/overlays';

export interface SegmentRequest {
  title: string;
  description?: string;
  kind: 'results' | 'attempts';
  ids: string[];
}

/** Drill-down: the students behind a bar or slice. Every row opens the full result. */
export function useSegmentDialog(results: CareerResult[] | undefined, attempts: ProgramAssessmentAttempt[] | undefined) {
  const [request, setRequest] = React.useState<SegmentRequest | null>(null);
  const resultById = React.useMemo(() => new Map((results ?? []).map((r) => [r.id, r])), [results]);
  const attemptById = React.useMemo(() => new Map((attempts ?? []).map((a) => [a.id, a])), [attempts]);

  const rows = request
    ? request.kind === 'results'
      ? request.ids.map((id) => resultById.get(id)).filter(Boolean)
      : request.ids.map((id) => attemptById.get(id)).filter(Boolean)
    : [];

  const dialog = (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && setRequest(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>
            {request?.description ?? `${rows.length} ${request?.kind === 'attempts' ? 'fit check' : 'student'}${rows.length === 1 ? '' : 's'}. Click one to open it.`}
          </DialogDescription>
        </DialogHeader>
        {!rows.length ? (
          <EmptyState icon={Users} title="Nobody here yet" compact />
        ) : (
          <ul className="-mx-2 max-h-[60vh] divide-y overflow-y-auto">
            {request?.kind === 'results'
              ? (rows as CareerResult[]).map((r) => (
                  <li key={r.id}>
                    <Link to={`/results/${r.id}`} onClick={() => setRequest(null)} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-gold-50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-navy-900">{r.studentSnapshot?.name || 'Student'}</div>
                        <div className="truncate text-xs text-navy-600">
                          {r.top3?.[0]?.programTitle} · {r.studentSnapshot?.shsStrand} · {formatDate(r.completedAt)}
                        </div>
                      </div>
                      <MatchPill value={r.bestMatchPercent} />
                      <ChevronRight className="size-4 text-navy-400" />
                    </Link>
                  </li>
                ))
              : (rows as ProgramAssessmentAttempt[]).map((a) => (
                  <li key={a.id}>
                    <Link to={`/attempts/${a.id}`} onClick={() => setRequest(null)} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-gold-50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-navy-900">{a.studentName}</div>
                        <div className="truncate text-xs text-navy-600">
                          {a.assessmentTitle} · {formatDate(a.completedAt)}
                        </div>
                      </div>
                      <FitBadge isFit={a.isFit} score={a.scorePercent} />
                      <ChevronRight className="size-4 text-navy-400" />
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );

  return { open: setRequest, dialog };
}
