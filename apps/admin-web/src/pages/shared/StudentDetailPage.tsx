import { formatDate, incomeLabel, initials, residenceLabel, studentStatusLabel, termLabel } from '@wisepath/shared';
import { ClipboardCheck, GraduationCap, Lock, Trophy } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, MatchPill, PageHeader, useRowLink } from '@/components/data/display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Badge, Card, CardContent, Skeleton, Table, TBody, TD, TH, THead, TR } from '@/components/ui/primitives';
import { useStudentPhoto, useUserDoc } from '@/lib/data/accounts';
import { useDepartments, usePrograms } from '@/lib/data/catalog';
import { useStudentProgress, useStudentResults } from '@/lib/data/results';
import { AttemptsTable } from './ResultsPage';

export function StudentDetailPage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { isSuperAdmin, actor, department } = useAuth();
  const deptId = actor?.departmentId ?? null;
  const { byId } = useDepartments();
  const programs = usePrograms(null);
  const programTitle = (id: string) => programs.data?.find((p) => p.id === id)?.title ?? id;
  const userDoc = useUserDoc(isSuperAdmin ? uid : undefined);
  const photo = useStudentPhoto(uid, isSuperAdmin && Boolean(userDoc.data?.hasPhoto));
  const results = useStudentResults(uid, deptId, isSuperAdmin);
  const progress = useStudentProgress(uid, deptId, isSuperAdmin);

  const latest = results.data?.[0];
  const name = userDoc.data?.displayName || latest?.studentSnapshot?.name || 'Student';
  const email = userDoc.data?.email || latest?.studentSnapshot?.email || '';
  const profile = userDoc.data?.profile;

  if (!isSuperAdmin && results.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!isSuperAdmin && !results.isLoading && !results.data?.length)
    return <ErrorState title="Not in your department’s results" error={new Error('This student has no results that include your department’s programs.')} />;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {photo.data ? (
          <img src={photo.data} alt="" className="size-16 rounded-2xl object-cover ring-2 ring-white shadow" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-teal-700 text-xl font-bold text-white shadow">
            {initials(name)}
          </span>
        )}
        <PageHeader
          className="mb-0 flex-1"
          eyebrow="Student"
          title={name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {email}
              {profile && <Badge>{studentStatusLabel(profile.studentStatus)}</Badge>}
              {userDoc.data?.status === 'disabled' && <Badge tone="rust">Disabled</Badge>}
            </span>
          }
        />
      </div>

      {!isSuperAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-white/70 px-4 py-2.5 text-[13px] text-navy-600">
          <Lock className="size-4 text-navy-400" /> You see this student’s activity related to {department?.name ?? 'your department'} only.
        </div>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">
            <Trophy /> Career results
          </TabsTrigger>
          <TabsTrigger value="attempts">
            <ClipboardCheck /> Fit checks
          </TabsTrigger>
          <TabsTrigger value="progress">
            <GraduationCap /> Progress
          </TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="profile">Profile</TabsTrigger>}
        </TabsList>

        <TabsContent value="results">
          <Card className="overflow-hidden">
            {results.error ? (
              <div className="p-5"><ErrorState error={results.error} /></div>
            ) : results.isLoading ? (
              <ListSkeleton />
            ) : !results.data?.length ? (
              <EmptyState icon={Trophy} title="No career assessment yet" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Taken</TH>
                    <TH>Top match</TH>
                    <TH className="hidden lg:table-cell">2nd & 3rd</TH>
                  </TR>
                </THead>
                <TBody>
                  {results.data.map((r) => {
                    const best = r.top3?.[0];
                    const link = rowLink(() => navigate(`/results/${r.id}`));
                    return (
                      <TR key={r.id} {...link}>
                        <TD className="whitespace-nowrap">
                          <div className="text-navy-900">{formatDate(r.completedAt, true)}</div>
                          {r.isLatest && <Badge tone="teal" className="mt-1">Latest</Badge>}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            <MatchPill value={r.bestMatchPercent} />
                            <span className="line-clamp-1 text-[13px] font-medium text-navy-900">{best?.programTitle}</span>
                          </div>
                        </TD>
                        <TD className="hidden text-xs text-navy-700 lg:table-cell">
                          {r.top3.slice(1).map((row) => (
                            <div key={row.programId} className="line-clamp-1">
                              {row.matchPercent}% · {row.programTitle}
                            </div>
                          ))}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="attempts">
          <Card className="overflow-hidden">
            <AttemptsTable filters={{ departmentId: deptId, isSuperAdmin, userId: uid }} />
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          {progress.isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : !progress.data?.length ? (
            <Card>
              <EmptyState icon={GraduationCap} title="No progress tracked" description="Current college students track subjects in the app’s Progress tab." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {progress.data.map((p) => {
                const dept = byId.get(p.departmentId);
                return (
                  <Card key={p.id} className="p-5">
                    <button onClick={() => navigate(`/programs/${p.programId}`)} className="text-left font-semibold text-navy-900 hover:underline">
                      {programTitle(p.programId)}
                    </button>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-navy-600">
                      <DeptDot color={dept?.color} /> {dept?.name}
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div className="tabular text-3xl font-bold text-navy-900">{p.percent}%</div>
                      <div className="text-right text-xs text-navy-600">
                        {termLabel(p.yearLevel, p.semester)}
                        <br />
                        {p.completedUnits}/{p.totalUnits} units
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-navy-50">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${p.percent}%` }} />
                    </div>
                    {p.graduationReady && <Badge tone="green" className="mt-3">Ready to graduate</Badge>}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="profile">
            <Card>
              <CardContent className="pt-6">
                {!profile ? (
                  <EmptyState title="Profile not completed yet" compact />
                ) : (
                  <dl className="grid gap-x-8 gap-y-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ['Status', studentStatusLabel(profile.studentStatus)],
                      ['SHS strand', profile.shsStrand],
                      ['Academic average', profile.academicAverage || '—'],
                      ['Residence', residenceLabel(profile.residenceType)],
                      ['Family income (private)', incomeLabel(profile.parentalIncomeLevel)],
                      ['Skill level', profile.currentSkills],
                      ['Learning style', profile.learningStyle],
                      ['Experience', profile.experience],
                      ['Joined', formatDate(userDoc.data?.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-navy-600">{label}</dt>
                        <dd className="font-medium text-navy-900">{value}</dd>
                      </div>
                    ))}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-navy-600">Career interests</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {profile.careerInterests.map((i) => (
                          <Badge key={i} tone="gold">{i}</Badge>
                        ))}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-navy-600">Learning goals</dt>
                      <dd className="mt-1 space-y-0.5 text-navy-900">
                        {profile.learningGoals.map((g) => (
                          <div key={g}>• {g}</div>
                        ))}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
