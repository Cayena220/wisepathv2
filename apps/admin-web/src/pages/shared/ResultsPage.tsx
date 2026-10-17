import { formatDate, formatManila, type CareerResult, type ProgramAssessmentAttempt } from '@wisepath/shared';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { ClipboardCheck, Search, Trophy, X } from 'lucide-react';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, FitBadge, ListSkeleton, MatchPill, PageHeader, useRowLink } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Badge, Card, Input, NativeSelect, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { useDepartments, usePrograms, useProgramAssessments } from '@/lib/data/catalog';
import {
  loadMoreAttempts,
  loadMoreResults,
  useAttempts,
  useCareerResults,
  type AttemptFilters,
  type ResultFilters,
  type ResultView,
} from '@/lib/data/results';

function usePaged<T>(first: { rows: T[]; last: QueryDocumentSnapshot | null } | undefined) {
  const [extra, setExtra] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<QueryDocumentSnapshot | null>(null);
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    setExtra([]);
    setCursor(first?.last ?? null);
    setDone((first?.rows.length ?? 0) < 25);
  }, [first]);
  return {
    rows: [...(first?.rows ?? []), ...extra],
    canLoadMore: Boolean(cursor) && !done,
    append: (page: { rows: T[]; last: QueryDocumentSnapshot | null }) => {
      setExtra((prev) => [...prev, ...page.rows]);
      setCursor(page.last);
      if (page.rows.length < 25) setDone(true);
    },
    cursor,
  };
}

function CareerResultsTable({ filters }: { filters: ResultFilters }) {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { byId } = useDepartments();
  const { data, isLoading, error } = useCareerResults(filters);
  const paged = usePaged<CareerResult>(data);
  const [loadingMore, setLoadingMore] = React.useState(false);

  if (error) return <div className="p-5"><ErrorState error={error} /></div>;
  if (isLoading) return <ListSkeleton rows={8} />;
  if (!paged.rows.length)
    return <EmptyState icon={Trophy} title="No results match" description="Try another filter. Results appear as students finish the career assessment." />;

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Top match</TH>
            <TH className="hidden xl:table-cell">2nd & 3rd</TH>
            <TH className="hidden md:table-cell">Taken</TH>
          </TR>
        </THead>
        <TBody>
          {paged.rows.map((r) => {
            const best = r.top3?.[0];
            const dept = best ? byId.get(best.departmentId) : undefined;
            const link = rowLink(() => navigate(`/results/${r.id}`));
            return (
              <TR key={r.id} {...link}>
                <TD>
                  <div className="flex items-center gap-2 font-medium text-navy-900">
                    {r.studentSnapshot?.name || 'Student'}
                    {r.isLatest && <Badge tone="teal">Latest</Badge>}
                  </div>
                  <div className="text-xs text-navy-600">{r.studentSnapshot?.email}</div>
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <MatchPill value={r.bestMatchPercent} />
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-[13px] font-medium text-navy-900">{best?.programTitle}</div>
                      <div className="flex items-center gap-1.5 text-xs text-navy-600">
                        <DeptDot color={dept?.color} /> {dept?.code ?? best?.departmentId}
                      </div>
                    </div>
                  </div>
                </TD>
                <TD className="hidden xl:table-cell">
                  <div className="space-y-0.5 text-xs text-navy-700">
                    {r.top3?.slice(1).map((row) => (
                      <div key={row.programId} className="line-clamp-1">
                        <span className="tabular font-semibold">{row.matchPercent}%</span> · {row.programTitle}
                      </div>
                    ))}
                  </div>
                </TD>
                <TD className="hidden whitespace-nowrap text-navy-600 md:table-cell">{formatDate(r.completedAt, true)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      {paged.canLoadMore && (
        <div className="border-t p-3 text-center">
          <Button
            variant="outline"
            loading={loadingMore}
            onClick={async () => {
              if (!paged.cursor) return;
              setLoadingMore(true);
              paged.append(await loadMoreResults(filters, paged.cursor));
              setLoadingMore(false);
            }}
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

export function AttemptsTable({ filters }: { filters: AttemptFilters }) {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { data, isLoading, error } = useAttempts(filters);
  const paged = usePaged<ProgramAssessmentAttempt>(data);
  const [loadingMore, setLoadingMore] = React.useState(false);

  if (error) return <div className="p-5"><ErrorState error={error} /></div>;
  if (isLoading) return <ListSkeleton rows={6} />;
  if (!paged.rows.length) return <EmptyState icon={ClipboardCheck} title="No fit checks yet" description="Students take program assessments from a program’s page in the app." />;
  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Program assessment</TH>
            <TH>Score</TH>
            <TH className="hidden md:table-cell">Taken</TH>
          </TR>
        </THead>
        <TBody>
          {paged.rows.map((a) => {
            const link = rowLink(() => navigate(`/attempts/${a.id}`));
            return (
              <TR key={a.id} {...link}>
                <TD>
                  <div className="font-medium text-navy-900">{a.studentName}</div>
                  <div className="text-xs text-navy-600">{a.studentEmail}</div>
                </TD>
                <TD>
                  <div className="line-clamp-1 text-[13px] font-medium text-navy-900">{a.assessmentTitle}</div>
                  <div className="line-clamp-1 text-xs text-navy-600">{a.programTitle}</div>
                </TD>
                <TD>
                  <FitBadge isFit={a.isFit} score={a.scorePercent} />
                </TD>
                <TD className="hidden whitespace-nowrap text-navy-600 md:table-cell">{formatDate(a.completedAt, true)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      {paged.canLoadMore && (
        <div className="border-t p-3 text-center">
          <Button
            variant="outline"
            loading={loadingMore}
            onClick={async () => {
              if (!paged.cursor) return;
              setLoadingMore(true);
              paged.append(await loadMoreAttempts(filters, paged.cursor));
              setLoadingMore(false);
            }}
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

export function ResultsPage() {
  const { isSuperAdmin, actor, department } = useAuth();
  const [params, setParams] = useSearchParams();
  const { departments } = useDepartments();
  const scopeDept = isSuperAdmin ? params.get('department') : actor?.departmentId ?? null;
  const programs = usePrograms(scopeDept);
  const assessments = useProgramAssessments(isSuperAdmin ? null : actor?.departmentId);
  const tab = params.get('tab') === 'attempts' ? 'attempts' : 'career';
  const view = (params.get('view') as ResultView) || 'all';
  const [search, setSearch] = React.useState(params.get('q') ?? '');

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'tab') {
      next.delete('since');
      next.delete('from');
      next.delete('to');
    }
    setParams(next, { replace: true });
  };

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((params.get('q') ?? '') !== search) set('q', search.trim() || null);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const from = Number(params.get('from')) || null;
  const to = Number(params.get('to')) || null;
  const since = Number(params.get('since')) || null;

  const filters: ResultFilters = {
    departmentId: scopeDept,
    isSuperAdmin,
    view,
    programId: params.get('program'),
    sinceDays: since,
    from,
    to,
    search: params.get('q') ?? '',
  };
  const attemptFilters: AttemptFilters = {
    departmentId: actor?.departmentId ?? null,
    isSuperAdmin,
    assessmentId: params.get('assessment'),
  };

  const activeChips = [
    since && { key: 'since', label: `Last ${since} days` },
    (from || to) && { key: 'from', label: `${from ? formatManila(from).split(',').slice(0, 2).join(',') : '…'} → ${to ? formatManila(to).split(',').slice(0, 2).join(',') : 'now'}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <>
      <PageHeader
        eyebrow={isSuperAdmin ? 'All departments' : department?.name}
        title="Results"
        description={
          isSuperAdmin
            ? 'Every student’s career assessment results and program fit checks. Click any row for the full breakdown.'
            : 'Students whose top-3 matches include your department’s programs, and their program fit checks. Click any row for the full breakdown.'
        }
      />
      <Tabs value={tab} onValueChange={(value) => set('tab', value === 'attempts' ? 'attempts' : null)}>
        <TabsList>
          <TabsTrigger value="career">
            <Trophy /> Career results
          </TabsTrigger>
          <TabsTrigger value="attempts">
            <ClipboardCheck /> Program fit checks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="career">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
              <div className="relative lg:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name…" className="pl-9" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <NativeSelect value={view} onChange={(e) => set('view', e.target.value === 'all' ? null : e.target.value)} aria-label="Which results">
                  <option value="all">All attempts</option>
                  <option value="latest">Latest per student</option>
                  {scopeDept && <option value="best">Best match in {isSuperAdmin ? 'department' : 'my department'}</option>}
                </NativeSelect>
                {isSuperAdmin ? (
                  <NativeSelect value={scopeDept ?? ''} onChange={(e) => set('department', e.target.value || null)} aria-label="Department">
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <NativeSelect value={params.get('program') ?? ''} onChange={(e) => set('program', e.target.value || null)} aria-label="Top-match program">
                  <option value="">Any top-match program</option>
                  {(programs.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b px-4 py-2.5">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => set(chip.key, null)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-xs font-medium text-white"
                  >
                    {chip.label} <X className="size-3.5" />
                  </button>
                ))}
              </div>
            )}
            <CareerResultsTable filters={filters} />
          </Card>
        </TabsContent>

        <TabsContent value="attempts">
          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <div className="sm:w-80">
                <NativeSelect value={params.get('assessment') ?? ''} onChange={(e) => set('assessment', e.target.value || null)} aria-label="Assessment">
                  <option value="">All program assessments</option>
                  {(assessments.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <AttemptsTable filters={attemptFilters} />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
