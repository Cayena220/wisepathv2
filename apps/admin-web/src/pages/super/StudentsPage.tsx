import { formatDate, studentStatusLabel, type UserDoc } from '@wisepath/shared';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Search, Users } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router';
import { EmptyState, ErrorState, ListSkeleton, MatchPill, PageHeader, useRowLink } from '@/components/data/display';
import { Button } from '@/components/ui/button';
import { Badge, Card, Input, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { loadMoreStudents, useStudents } from '@/lib/data/accounts';

export function StudentsPage() {
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const [search, setSearch] = React.useState('');
  const [term, setTerm] = React.useState('');
  const { data, isLoading, error } = useStudents(term);
  const [extra, setExtra] = React.useState<UserDoc[]>([]);
  const [cursor, setCursor] = React.useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setExtra([]);
    setCursor(data?.last ?? null);
  }, [data]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const rows = [...(data?.rows ?? []), ...extra];
  const canLoadMore = !term && cursor && (data?.rows.length ?? 0) + extra.length >= 25 && rows.length % 25 === 0;

  return (
    <>
      <PageHeader eyebrow="Students" title="Students" description="Everyone who registered on the Android app. Click a student to see their results, fit checks and progress." />
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name (starts with)…" className="pl-9" />
          </div>
        </div>
        {error ? (
          <div className="p-5">
            <ErrorState error={error} />
          </div>
        ) : isLoading ? (
          <ListSkeleton rows={8} />
        ) : !rows.length ? (
          <EmptyState icon={Users} title={term ? 'No students match' : 'No students yet'} description={term ? 'Search matches the beginning of the name.' : 'Students appear here after they register on Android.'} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Strand</TH>
                <TH>Top match</TH>
                <TH className="hidden md:table-cell">Joined</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => {
                const link = rowLink(() => navigate(`/students/${s.id}`));
                return (
                  <TR key={s.id} {...link}>
                    <TD>
                      <div className="font-medium text-navy-900">{s.displayName || s.profile?.name || s.email}</div>
                      <div className="text-xs text-navy-600">{s.email}</div>
                    </TD>
                    <TD className="hidden md:table-cell">
                      {s.profileComplete ? <span className="text-navy-700">{studentStatusLabel(s.profile?.studentStatus)}</span> : <Badge tone="amber">Profile incomplete</Badge>}
                    </TD>
                    <TD className="hidden text-navy-700 lg:table-cell">{s.profile?.shsStrand ?? '—'}</TD>
                    <TD>
                      {s.latestResult ? (
                        <div className="flex items-center gap-2">
                          <MatchPill value={s.latestResult.bestMatchPercent} />
                          <span className="line-clamp-1 text-[13px] text-navy-900">{s.latestResult.bestProgramTitle}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-navy-400">No assessment yet</span>
                      )}
                    </TD>
                    <TD className="hidden text-navy-600 md:table-cell">{formatDate(s.createdAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
        {canLoadMore && (
          <div className="border-t p-3 text-center">
            <Button
              variant="outline"
              loading={loadingMore}
              onClick={async () => {
                if (!cursor) return;
                setLoadingMore(true);
                const more = await loadMoreStudents(cursor);
                setExtra((prev) => [...prev, ...more.rows]);
                setCursor(more.last);
                setLoadingMore(false);
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
