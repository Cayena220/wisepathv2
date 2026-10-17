import {
  DIMENSION_LABELS,
  DIMENSIONS,
  formatDate,
  formatTuition,
  termLabel,
  type Program,
} from '@wisepath/shared';
import { Archive, ArrowRight, BookOpen, ClipboardCheck, Compass, History, Lock, Pencil, RotateCcw, Trash2, Users } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useActor, useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, MatchPill, PageHeader, StatusBadge } from '@/components/data/display';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/overlays';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { deleteProgram, setProgramStatus, useDepartments, useInvalidateCatalog, useProgram, useProgramAssessments } from '@/lib/data/catalog';
import { useCareerResults } from '@/lib/data/results';
import { errorMessage } from '@/lib/utils';
import { AuditList } from './AuditLogPage';
import { canEditProgram } from './ProgramsPage';
import { useAuditLog } from '@/lib/data/results';

function SignalChips({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values ?? {}).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-navy-700">{title}</div>
      {entries.length ? (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([label, weight]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-navy-900 ring-1 ring-navy-900/5">
              {label} <span className="tabular rounded-full bg-gold-100 px-1.5 font-semibold text-gold-700">+{weight}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-navy-400">None</div>
      )}
    </div>
  );
}

function ProgramStudents({ program }: { program: Program }) {
  const { actor, isSuperAdmin } = useAuth();
  const { data, isLoading, error } = useCareerResults({
    departmentId: isSuperAdmin ? null : actor?.departmentId ?? null,
    isSuperAdmin,
    view: 'latest',
    programId: program.id,
  });
  if (error) return <ErrorState error={error} />;
  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!data?.rows.length)
    return (
      <Card>
        <EmptyState icon={Users} title="No students best-matched yet" description="Students whose latest top match is this program will appear here." />
      </Card>
    );
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y">
        {data.rows.map((r) => (
          <li key={r.id}>
            <Link to={`/results/${r.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-gold-50/70">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-navy-900">{r.studentSnapshot?.name}</div>
                <div className="truncate text-xs text-navy-600">
                  {r.studentSnapshot?.shsStrand} · {formatDate(r.completedAt)}
                </div>
              </div>
              <MatchPill value={r.bestMatchPercent} />
              <ArrowRight className="size-4 text-navy-400" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t px-5 py-3 text-right">
        <Link to={`/results?program=${program.id}`} className="text-[13px] font-medium text-teal-700 hover:underline">
          Open in Results →
        </Link>
      </div>
    </Card>
  );
}

export function ProgramDetailPage() {
  const { programId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, actor, isSuperAdmin } = useAuth();
  const { byId } = useDepartments();
  const { data: program, isLoading, error } = useProgram(programId);
  const assessments = useProgramAssessments(isSuperAdmin ? null : actor?.departmentId);
  const invalidate = useInvalidateCatalog();
  const [confirm, setConfirm] = React.useState<'archive' | 'restore' | 'delete' | null>(null);
  const [busy, setBusy] = React.useState(false);
  const audit = useAuditLog({ departmentId: actor?.departmentId ?? null, isSuperAdmin, targetId: programId ?? null, max: 30 });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !program) return <ErrorState error={error ?? new Error('Program not found.')} />;

  const dept = byId.get(program.departmentId);
  const editable = canEditProgram(role, actor?.departmentId, program);
  const mine = isSuperAdmin || editable;
  const programAssessments = (assessments.data ?? []).filter((a) => a.programId === program.id);
  const tab = params.get('tab') ?? 'overview';
  const subjects = program.curriculum.reduce((n, t) => n + t.subjects.length, 0);
  const units = program.curriculum.reduce((n, t) => n + t.subjects.reduce((u, s) => u + s.units, 0), 0);

  return (
    <ProgramActions program={program} confirm={confirm} setConfirm={setConfirm} busy={busy} setBusy={setBusy} invalidate={invalidate} navigate={navigate}>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <DeptDot color={dept?.color} /> {dept?.name ?? program.departmentId}
          </span>
        }
        title={program.title}
        description={`${program.code} · ${program.durationYears}-year program · ${program.difficulty}`}
        actions={
          editable ? (
            <>
              <StatusBadge status={program.status} />
              <Button asChild>
                <Link to={`/programs/${program.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              {program.status === 'active' ? (
                <Button variant="outline" onClick={() => setConfirm('archive')}>
                  <Archive /> Archive
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConfirm('restore')}>
                    <RotateCcw /> Restore
                  </Button>
                  <Button variant="destructive-outline" onClick={() => setConfirm('delete')}>
                    <Trash2 /> Delete
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <StatusBadge status={program.status} />
              <Badge tone="neutral">
                <Lock /> {isSuperAdmin ? 'Managed by the department admin' : 'Another department — view only'}
              </Badge>
            </>
          )
        }
      />

      <Tabs value={tab} onValueChange={(value) => setParams(value === 'overview' ? {} : { tab: value }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="curriculum">
            <BookOpen /> Curriculum
          </TabsTrigger>
          <TabsTrigger value="matching">
            <Compass /> Matching
          </TabsTrigger>
          {mine && (
            <TabsTrigger value="assessments">
              <ClipboardCheck /> Assessments
            </TabsTrigger>
          )}
          {mine && (
            <TabsTrigger value="students">
              <Users /> Students
            </TabsTrigger>
          )}
          {mine && (
            <TabsTrigger value="activity">
              <History /> Activity
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <p className="text-[15px] leading-relaxed text-navy-700">{program.description || 'No description yet.'}</p>
                <div>
                  <div className="mb-2 text-[13px] font-semibold text-navy-900">Skills you’ll learn</div>
                  <div className="flex flex-wrap gap-1.5">
                    {program.skills.map((s) => (
                      <Badge key={s} tone="teal">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-semibold text-navy-900">Career paths</div>
                  <div className="flex flex-wrap gap-1.5">
                    {program.careerPaths.map((s) => (
                      <Badge key={s} tone="gold">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="p-5">
              <dl className="space-y-3 text-[13px]">
                {[
                  ['Tuition per term', formatTuition(program.tuitionPerTerm)],
                  ['Duration', `${program.durationYears} years`],
                  ['Curriculum', `${subjects} subjects · ${units} units`],
                  ['Program assessments', String(programAssessments.length)],
                  ['Created by', `${program.createdByName ?? '—'} · ${formatDate(program.createdAt)}`],
                  ['Last updated', `${program.updatedByName ?? '—'} · ${formatDate(program.updatedAt)}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-dashed pb-2 last:border-0">
                    <dt className="text-navy-600">{label}</dt>
                    <dd className="text-right font-medium text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="curriculum">
          {!program.curriculum.length ? (
            <Card>
              <EmptyState icon={BookOpen} title="No curriculum yet" />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {program.curriculum.map((term) => (
                <Card key={`${term.year}-${term.semester}`}>
                  <CardHeader className="pb-2">
                    <CardTitle>{termLabel(term.year, term.semester)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y text-[13px]">
                      {term.subjects.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 py-2">
                          <span className="w-20 shrink-0 font-mono text-xs text-navy-600">{s.code}</span>
                          <span className="flex-1 text-navy-900">{s.title}</span>
                          <span className="tabular text-xs text-navy-600">{s.units} u</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matching">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardHeader>
                <CardTitle>Career-assessment affinity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DIMENSIONS.map((d) => {
                  const value = program.dimensionAffinity?.[d] ?? 0;
                  return (
                    <div key={d}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-navy-700">{DIMENSION_LABELS[d]}</span>
                        <span className="tabular font-semibold text-navy-900">×{value.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-navy-50">
                        <div className="h-2 rounded-full bg-teal-600" style={{ width: `${value * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-navy-600">Each answer adds points to a dimension; the program receives those points multiplied by its affinity.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Profile signals (×0.85)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignalChips title="Career interests" values={program.matchSignals?.careerInterests} />
                <SignalChips title="Senior high strand" values={program.matchSignals?.shsStrands} />
                <SignalChips title="Learning goals" values={program.matchSignals?.learningGoals} />
                <SignalChips title="Learning style" values={program.matchSignals?.learningStyles} />
                <SignalChips title="Skill level" values={program.matchSignals?.skillLevels} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {mine && (
          <TabsContent value="assessments">
            <Card className="overflow-hidden">
              {programAssessments.length ? (
                <ul className="divide-y">
                  {programAssessments.map((a) => (
                    <li key={a.id}>
                      <Link to={`/program-assessments/${a.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gold-50/70">
                        <ClipboardCheck className="size-5 text-gold-700" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-navy-900">{a.title}</div>
                          <div className="text-xs text-navy-600">
                            {a.questions.length} questions · pass mark {a.passingPercent}%
                          </div>
                        </div>
                        <StatusBadge status={a.status} />
                        <ArrowRight className="size-4 text-navy-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No program assessment yet"
                  description="A short fit check lets students test whether this program suits them."
                  action={
                    editable ? (
                      <Button asChild size="sm">
                        <Link to={`/program-assessments/new?program=${program.id}`}>Create assessment</Link>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </Card>
          </TabsContent>
        )}
        {mine && (
          <TabsContent value="students">
            <ProgramStudents program={program} />
          </TabsContent>
        )}
        {mine && (
          <TabsContent value="activity">
            <Card className="overflow-hidden">
              <AuditList logs={audit.data} loading={audit.isLoading} error={audit.error} />
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </ProgramActions>
  );
}

function ProgramActions({
  program,
  confirm,
  setConfirm,
  busy,
  setBusy,
  invalidate,
  navigate,
  children,
}: {
  program: Program;
  confirm: 'archive' | 'restore' | 'delete' | null;
  setConfirm: (v: 'archive' | 'restore' | 'delete' | null) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  invalidate: () => Promise<unknown>;
  navigate: (to: string) => void;
  children: React.ReactNode;
}) {
  const actor = useActor();
  const run = async () => {
    setBusy(true);
    try {
      if (confirm === 'delete') {
        await deleteProgram(actor, program);
        toast.success('Program deleted');
        await invalidate();
        navigate('/programs');
      } else if (confirm) {
        await setProgramStatus(actor, program, confirm === 'archive' ? 'archived' : 'active');
        toast.success(confirm === 'archive' ? 'Program archived — students won’t be matched to it' : 'Program restored');
        await invalidate();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  return (
    <>
      {children}
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {confirm === 'delete' ? 'Delete' : confirm === 'archive' ? 'Archive' : 'Restore'} {program.code}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === 'delete'
              ? 'This permanently removes the program. Past student results keep its name. This cannot be undone.'
              : confirm === 'archive'
                ? 'Students will no longer be matched to this program and it disappears from the app. You can restore it later.'
                : 'Students will be matched to this program again.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: confirm === 'restore' ? 'default' : 'destructive' })}
              onClick={(e) => {
                e.preventDefault();
                void run();
              }}
              disabled={busy}
            >
              {confirm === 'delete' ? 'Delete permanently' : confirm === 'archive' ? 'Archive' : 'Restore'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
