import {
  LIMITS,
  computeQuestionAnalytics,
  formatDate,
  shortId,
  type ProgramAssessment,
  type ProgramAssessmentQuestion,
} from '@wisepath/shared';
import { Archive, ArrowLeft, ClipboardCheck, GripVertical, Lock, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useActor, useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, PageHeader, StatusBadge, useRowLink } from '@/components/data/display';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/overlays';
import { Card, CardContent, CardHeader, CardTitle, Field, Input, NativeSelect, Skeleton, Table, TBody, TD, TH, THead, TR, Textarea } from '@/components/ui/primitives';
import {
  deleteProgramAssessment,
  saveProgramAssessment,
  setAssessmentStatus,
  useDepartments,
  useInvalidateCatalog,
  useProgramAssessment,
  useProgramAssessments,
  usePrograms,
} from '@/lib/data/catalog';
import { errorMessage } from '@/lib/utils';
import { QuestionAnalysisCard } from '@/components/analytics/widgets';
import { useAssessmentAttempts } from '@/lib/data/analytics';
import { AttemptsTable } from './ResultsPage';

const canEdit = (role: string | null, departmentId: string | null | undefined, a: Pick<ProgramAssessment, 'departmentId'>) =>
  role === 'admin' && a.departmentId === departmentId;

// ================================================================ list

export function ProgramAssessmentsPage() {
  const { isSuperAdmin, actor, role, department } = useAuth();
  const navigate = useNavigate();
  const rowLink = useRowLink();
  const { byId } = useDepartments();
  const { data, isLoading, error } = useProgramAssessments(isSuperAdmin ? null : actor?.departmentId);
  const programs = usePrograms(null);
  const programTitle = (id: string) => programs.data?.find((p) => p.id === id)?.title ?? id;

  return (
    <>
      <PageHeader
        eyebrow={isSuperAdmin ? 'Catalog' : department?.name}
        title="Program assessments"
        description="Short fit checks students take for a specific program. A score at or above the pass mark marks the student as a fit."
        actions={
          role === 'admin' && (
            <Button asChild>
              <Link to="/program-assessments/new">
                <Plus /> New assessment
              </Link>
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5"><ErrorState error={error} /></div>
        ) : isLoading ? (
          <ListSkeleton />
        ) : !data?.length ? (
          <EmptyState icon={ClipboardCheck} title="No program assessments yet" description="Create a fit check for one of your programs." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Assessment</TH>
                <TH className="hidden md:table-cell">Program</TH>
                {isSuperAdmin && <TH className="hidden lg:table-cell">Department</TH>}
                <TH className="hidden sm:table-cell">Questions</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((a) => {
                const link = rowLink(() => navigate(`/program-assessments/${a.id}`));
                const dept = byId.get(a.departmentId);
                return (
                  <TR key={a.id} {...link}>
                    <TD>
                      <div className="font-medium text-navy-900">{a.title}</div>
                      <div className="text-xs text-navy-600">Pass mark {a.passingPercent}% · v{a.version}</div>
                    </TD>
                    <TD className="hidden text-[13px] text-navy-700 md:table-cell">{programTitle(a.programId)}</TD>
                    {isSuperAdmin && (
                      <TD className="hidden lg:table-cell">
                        <span className="flex items-center gap-2 text-[13px]">
                          <DeptDot color={dept?.color} /> {dept?.code}
                        </span>
                      </TD>
                    )}
                    <TD className="hidden sm:table-cell">{a.questions.length}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

// ================================================================ detail

export function ProgramAssessmentDetailPage() {
  const { assessmentId } = useParams();
  const actor = useActor();
  const { role, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidateCatalog();
  const { data: a, isLoading, error } = useProgramAssessment(assessmentId);
  const programs = usePrograms(null);
  const [confirm, setConfirm] = React.useState<'archive' | 'restore' | 'delete' | null>(null);
  const canSeeAttempts = Boolean(a) && (isSuperAdmin || a?.departmentId === actor.departmentId);
  const attemptsForAnalysis = useAssessmentAttempts(assessmentId, actor.departmentId, isSuperAdmin, canSeeAttempts);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error || !a) return <ErrorState error={error ?? new Error('Assessment not found.')} />;
  const editable = canEdit(role, actor.departmentId, a);
  const program = programs.data?.find((p) => p.id === a.programId);
  const maxPoints = a.questions.reduce((s, q) => s + Math.max(0, ...q.options.map((o) => o.points)), 0);

  const run = async () => {
    try {
      if (confirm === 'delete') {
        await deleteProgramAssessment(actor, a);
        await invalidate();
        toast.success('Assessment deleted');
        navigate('/program-assessments');
      } else if (confirm) {
        await setAssessmentStatus(actor, a, confirm === 'archive' ? 'archived' : 'active');
        await invalidate();
        toast.success(confirm === 'archive' ? 'Assessment archived' : 'Assessment restored');
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setConfirm(null);
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to={`/programs/${a.programId}`} className="hover:underline">
            {program?.title ?? a.programId}
          </Link>
        }
        title={a.title}
        description={`${a.questions.length} questions · ${maxPoints} points · pass mark ${a.passingPercent}% · version ${a.version} · updated ${formatDate(a.updatedAt)} by ${a.updatedByName ?? '—'}`}
        actions={
          editable ? (
            <>
              <StatusBadge status={a.status} />
              <Button asChild>
                <Link to={`/program-assessments/${a.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              {a.status === 'active' ? (
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
              <StatusBadge status={a.status} />
              <span className="inline-flex items-center gap-1.5 text-[13px] text-navy-600">
                <Lock className="size-4" /> {isSuperAdmin ? 'Managed by the department admin' : 'View only'}
              </span>
            </>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {a.description && <p className="mb-4 text-[13px] text-navy-600">{a.description}</p>}
            <ol className="space-y-4">
              {a.questions.map((q, i) => (
                <li key={q.id}>
                  <div className="text-[13.5px] font-medium text-navy-900">
                    {i + 1}. {q.text}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {q.options.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface/60 px-3 py-1.5 text-[13px]">
                        <span className="text-navy-700">{o.text}</span>
                        <span className="tabular shrink-0 font-semibold text-teal-700">{o.points} pts</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="h-fit overflow-hidden">
          <CardHeader>
            <CardTitle>Student attempts</CardTitle>
          </CardHeader>
          {editable || isSuperAdmin ? (
            <AttemptsTable filters={{ departmentId: actor.departmentId, isSuperAdmin, assessmentId: a.id }} />
          ) : (
            <EmptyState icon={Lock} title="Attempts are visible to the owning department" compact />
          )}
        </Card>
      </div>
      {canSeeAttempts && (
        <QuestionAnalysisCard
          className="mt-6"
          questions={computeQuestionAnalytics(a, attemptsForAnalysis.data ?? [])}
          attempts={attemptsForAnalysis.data?.length ?? 0}
        />
      )}
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{confirm === 'delete' ? 'Delete' : confirm === 'archive' ? 'Archive' : 'Restore'} “{a.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm === 'delete'
              ? 'This permanently removes the assessment. Past attempts keep their scores.'
              : confirm === 'archive'
                ? 'Students will no longer be able to take it.'
                : 'Students can take it again.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: confirm === 'restore' ? 'default' : 'destructive' })} onClick={() => void run()}>
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ================================================================ builder

const blankQuestion = (): ProgramAssessmentQuestion => ({
  id: shortId('q'),
  text: '',
  options: [
    { id: 'a', text: '', points: 10 },
    { id: 'b', text: '', points: 5 },
    { id: 'c', text: '', points: 0 },
  ],
});

export function ProgramAssessmentFormPage() {
  const { assessmentId } = useParams();
  const [params] = useSearchParams();
  const isNew = !assessmentId;
  const actor = useActor();
  const { role, department } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidateCatalog();
  const { data: existing, isLoading } = useProgramAssessment(assessmentId);
  const programs = usePrograms(actor.departmentId);
  const [programId, setProgramId] = React.useState(params.get('program') ?? '');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [passing, setPassing] = React.useState<number>(LIMITS.defaultPassingPercent);
  const [questions, setQuestions] = React.useState<ProgramAssessmentQuestion[]>([blankQuestion()]);
  const [loaded, setLoaded] = React.useState(isNew);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!existing || loaded) return;
    setProgramId(existing.programId);
    setTitle(existing.title);
    setDescription(existing.description);
    setPassing(existing.passingPercent);
    setQuestions(existing.questions);
    setLoaded(true);
  }, [existing, loaded]);

  if (role !== 'admin') return <Navigate to="/program-assessments" replace />;
  if (!isNew && isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (existing && existing.departmentId !== actor.departmentId)
    return <ErrorState title="Read-only" error={new Error('Only the admin of the owning department can edit this assessment.')} />;

  const updateQ = (id: string, patch: Partial<ProgramAssessmentQuestion>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const cleaned = questions
    .map((q) => ({ ...q, text: q.text.trim(), options: q.options.filter((o) => o.text.trim()).map((o) => ({ ...o, text: o.text.trim() })) }))
    .filter((q) => q.text);
  const maxPoints = cleaned.reduce((s, q) => s + Math.max(0, ...q.options.map((o) => o.points)), 0);
  const valid = Boolean(programId) && title.trim().length >= 3 && cleaned.length >= 1 && cleaned.every((q) => q.options.length >= 2) && maxPoints > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const id = await saveProgramAssessment(
        actor,
        { programId, title: title.trim(), description: description.trim(), passingPercent: passing, questions: cleaned },
        existing ?? null,
      );
      await invalidate();
      toast.success(isNew ? 'Assessment created' : 'Assessment saved (new version)');
      navigate(`/program-assessments/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Link to="/program-assessments" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-600 hover:text-navy-900">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <PageHeader
        eyebrow={department?.name}
        title={isNew ? 'New program assessment' : `Edit “${existing?.title}”`}
        description="Give each answer 0–10 points. The score is the points earned out of the best possible total."
        actions={
          <Button type="submit" disabled={!valid} loading={busy}>
            <Save /> Save assessment
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <Field label="Program" htmlFor="program" required hint={isNew ? undefined : 'The program cannot be changed after creation.'}>
                <NativeSelect id="program" value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={!isNew}>
                  <option value="">Choose one of your programs…</option>
                  {(programs.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Title" htmlFor="title" required>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="IT fit check" />
              </Field>
              <Field label="Description" htmlFor="desc" className="sm:col-span-2">
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this assessment checks." />
              </Field>
            </CardContent>
          </Card>
          {questions.map((q, qi) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2.5 size-4 shrink-0 text-navy-200" />
                  <span className="mt-2 text-sm font-semibold text-navy-400">{qi + 1}.</span>
                  <Textarea value={q.text} onChange={(e) => updateQ(q.id, { text: e.target.value })} rows={2} placeholder="Question" className="min-h-0" aria-label={`Question ${qi + 1}`} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} disabled={questions.length === 1} aria-label="Remove question">
                    <Trash2 />
                  </Button>
                </div>
                <div className="space-y-2 pl-10">
                  {q.options.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Input
                        className="h-9"
                        value={o.text}
                        placeholder="Answer"
                        aria-label="Answer"
                        onChange={(e) => updateQ(q.id, { options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
                      />
                      <div className="flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={o.points}
                          onChange={(e) =>
                            updateQ(q.id, { options: q.options.map((x) => (x.id === o.id ? { ...x, points: Math.max(0, Math.min(10, Number(e.target.value))) } : x)) })
                          }
                          className="tabular h-8 w-10 text-center text-sm outline-none"
                          aria-label="Points"
                        />
                        <span className="text-xs text-navy-400">pts</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={q.options.length <= 2}
                        onClick={() => updateQ(q.id, { options: q.options.filter((x) => x.id !== o.id) })}
                        aria-label="Remove answer"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => updateQ(q.id, { options: [...q.options, { id: shortId('o'), text: '', points: 0 }] })}>
                      <Plus /> Add answer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} disabled={questions.length >= 30}>
            <Plus /> Add question
          </Button>
        </div>
        <Card className="h-fit p-5 xl:sticky xl:top-24">
          <div className="font-semibold text-navy-900">Scoring</div>
          <Field label={`Pass mark: ${passing}%`} htmlFor="passing" className="mt-4">
            <input id="passing" type="range" min={50} max={100} step={5} value={passing} onChange={(e) => setPassing(Number(e.target.value))} className="w-full accent-[#3E7A6C]" />
          </Field>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-navy-600">Questions</dt>
              <dd className="font-semibold text-navy-900">{cleaned.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-600">Best possible score</dt>
              <dd className="font-semibold text-navy-900">{maxPoints} pts</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-navy-600">Needed to be a fit</dt>
              <dd className="font-semibold text-teal-700">{Math.ceil((maxPoints * passing) / 100)} pts</dd>
            </div>
          </dl>
          {!valid && <p className="mt-4 text-xs text-navy-600">Choose a program, add a title, and give every question at least two answers.</p>}
        </Card>
      </div>
    </form>
  );
}
