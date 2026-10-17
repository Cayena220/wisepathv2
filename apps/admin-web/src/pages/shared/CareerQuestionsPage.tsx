import {
  DIMENSION_LABELS,
  DIMENSIONS,
  LIMITS,
  shortId,
  type CareerQuestion,
  type CareerQuestionOption,
  type DimensionWeights,
  type Program,
} from '@wisepath/shared';
import { Archive, Lock, MessageCircleQuestion, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { useActor, useAuth } from '@/auth/AuthProvider';
import { DeptDot, EmptyState, ErrorState, ListSkeleton, PageHeader, StatusBadge } from '@/components/data/display';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays';
import { Badge, Card, Field, Input, NativeSelect, Textarea } from '@/components/ui/primitives';
import {
  deleteCareerQuestion,
  saveCareerQuestion,
  setQuestionStatus,
  useCareerQuestions,
  useDepartments,
  useInvalidateCatalog,
  usePrograms,
} from '@/lib/data/catalog';
import { errorMessage } from '@/lib/utils';

const canManage = (q: CareerQuestion, role: string | null, departmentId: string | null | undefined) =>
  (q.scope === 'system' && role === 'superadmin') || (q.scope === 'department' && role === 'admin' && q.departmentId === departmentId);

function OptionEffect({ option, programs }: { option: CareerQuestionOption; programs: Program[] }) {
  if (option.programId) {
    const p = programs.find((x) => x.id === option.programId);
    return <Badge tone="gold">→ {p?.code ?? option.programId} +3</Badge>;
  }
  const entries = DIMENSIONS.filter((d) => option.dimensionWeights?.[d]);
  if (!entries.length) return <Badge>No points</Badge>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map((d) => (
        <Badge key={d} tone="teal">
          {DIMENSION_LABELS[d].split(' ')[0]} +{option.dimensionWeights[d]}
        </Badge>
      ))}
    </span>
  );
}

interface OptionDraft {
  id: string;
  text: string;
  mode: 'dimensions' | 'program';
  weights: DimensionWeights;
  programId: string;
}

function QuestionDialog({
  open,
  onOpenChange,
  question,
  order,
  programs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: CareerQuestion | null;
  order: number;
  programs: Program[];
}) {
  const actor = useActor();
  const invalidate = useInvalidateCatalog();
  const [text, setText] = React.useState('');
  const [options, setOptions] = React.useState<OptionDraft[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setText(question?.text ?? '');
    setOptions(
      question?.options.map((o) => ({
        id: o.id,
        text: o.text,
        mode: o.programId ? 'program' : 'dimensions',
        weights: { ...o.dimensionWeights },
        programId: o.programId ?? '',
      })) ?? [
        { id: 'a', text: '', mode: 'dimensions', weights: {}, programId: '' },
        { id: 'b', text: '', mode: 'dimensions', weights: {}, programId: '' },
      ],
    );
  }, [open, question]);

  const update = (id: string, patch: Partial<OptionDraft>) => setOptions((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const filled = options.filter((o) => o.text.trim());
  const valid = text.trim().length >= 5 && filled.length >= 2 && filled.every((o) => o.mode === 'dimensions' || o.programId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveCareerQuestion(
        actor,
        {
          text: text.trim(),
          options: filled.map((o) => ({
            id: o.id,
            text: o.text.trim(),
            dimensionWeights: o.mode === 'dimensions' ? Object.fromEntries(Object.entries(o.weights).filter(([, v]) => (v ?? 0) > 0)) : {},
            programId: o.mode === 'program' ? o.programId : null,
          })),
        },
        question,
        order,
      );
      await invalidate();
      toast.success(question ? 'Question saved' : 'Question added to the career assessment');
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit question' : 'New career question'}</DialogTitle>
          <DialogDescription>
            Each answer either adds points to a broad dimension (which reaches every related program), or gives +3 directly to one specific program.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Question" htmlFor="q-text" required>
            <Textarea id="q-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300} placeholder="Which activity sounds most fun to you?" />
          </Field>
          <div className="space-y-3">
            {options.map((o, index) => (
              <div key={o.id} className="rounded-xl border bg-surface/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-white">{String.fromCharCode(65 + index)}</span>
                  <Input className="h-9" value={o.text} onChange={(e) => update(o.id, { text: e.target.value })} placeholder={`Answer ${index + 1}`} aria-label={`Answer ${index + 1}`} />
                  {options.length > 2 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOptions((l) => l.filter((x) => x.id !== o.id))} aria-label="Remove answer">
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-2 pl-9 sm:flex-row sm:items-center">
                  <NativeSelect className="h-9 sm:w-48" value={o.mode} onChange={(e) => update(o.id, { mode: e.target.value as OptionDraft['mode'] })} aria-label="Scoring">
                    <option value="dimensions">Scores dimensions</option>
                    <option value="program">Points to one program</option>
                  </NativeSelect>
                  {o.mode === 'dimensions' ? (
                    <div className="flex flex-wrap gap-2">
                      {DIMENSIONS.map((d) => (
                        <label key={d} className="flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs text-navy-700">
                          {DIMENSION_LABELS[d].split(' ')[0]}
                          <input
                            type="number"
                            min={0}
                            max={3}
                            value={o.weights[d] ?? 0}
                            onChange={(e) => update(o.id, { weights: { ...o.weights, [d]: Math.max(0, Math.min(3, Number(e.target.value))) } })}
                            className="w-10 rounded border px-1 py-0.5 text-center"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <NativeSelect className="h-9" value={o.programId} onChange={(e) => update(o.id, { programId: e.target.value })} aria-label="Program">
                      <option value="">Choose a program…</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.title}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </div>
              </div>
            ))}
            {options.length < 6 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setOptions((l) => [...l, { id: shortId('o'), text: '', mode: 'dimensions', weights: {}, programId: '' }])}>
                <Plus /> Add answer
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} loading={busy}>
              {question ? 'Save question' : 'Add question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CareerQuestionsPage() {
  const actor = useActor();
  const { role, department, isSuperAdmin } = useAuth();
  const { data, isLoading, error } = useCareerQuestions();
  const { byId } = useDepartments();
  const allPrograms = usePrograms(null);
  const invalidate = useInvalidateCatalog();
  const [editing, setEditing] = React.useState<CareerQuestion | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{ kind: 'archive' | 'restore' | 'delete'; q: CareerQuestion } | null>(null);

  const questions = data ?? [];
  const system = questions.filter((q) => q.scope === 'system');
  const mine = questions.filter((q) => q.scope === 'department' && q.departmentId === actor.departmentId);
  const others = questions.filter((q) => q.scope === 'department' && q.departmentId !== actor.departmentId);
  const myActive = mine.filter((q) => q.status === 'active').length;
  const canAdd = isSuperAdmin || myActive < LIMITS.maxDeptCareerQuestions;
  const pickable = (allPrograms.data ?? []).filter((p) => p.status === 'active' && (isSuperAdmin || p.departmentId === actor.departmentId));
  const nextOrder = isSuperAdmin ? Math.max(0, ...system.map((q) => q.order)) + 1 : 100 + Math.max(0, ...mine.map((q) => q.order - 100)) + 1;

  const run = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === 'delete') await deleteCareerQuestion(actor, confirm.q);
      else await setQuestionStatus(actor, confirm.q, confirm.kind === 'archive' ? 'archived' : 'active');
      await invalidate();
      toast.success(confirm.kind === 'delete' ? 'Question deleted' : confirm.kind === 'archive' ? 'Question archived' : 'Question restored');
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setConfirm(null);
  };

  const QuestionCard = ({ q, index }: { q: CareerQuestion; index: number }) => {
    const manageable = canManage(q, role, actor.departmentId);
    const dept = q.departmentId ? byId.get(q.departmentId) : undefined;
    return (
      <Card className={q.status === 'archived' ? 'opacity-70' : undefined}>
        <div className="flex items-start gap-3 p-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-sm font-bold text-gold-700 ring-1 ring-gold-500/20">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold text-navy-900">{q.text}</div>
              {q.status === 'archived' && <StatusBadge status="archived" />}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-navy-600">
              {q.scope === 'system' ? (
                'Core question · Super Admin'
              ) : (
                <>
                  <DeptDot color={dept?.color} /> {dept?.code} · {q.createdByName}
                </>
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {q.options.map((o, i) => (
                <li key={o.id} className="flex flex-col gap-1 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-navy-900">
                    <span className="mr-1.5 font-semibold text-navy-400">{String.fromCharCode(65 + i)}.</span>
                    {o.text}
                  </span>
                  <OptionEffect option={o} programs={allPrograms.data ?? []} />
                </li>
              ))}
            </ul>
          </div>
          {manageable ? (
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(q); setFormOpen(true); }} aria-label="Edit">
                <Pencil />
              </Button>
              {q.status === 'active' ? (
                <Button variant="ghost" size="icon-sm" onClick={() => setConfirm({ kind: 'archive', q })} aria-label="Archive">
                  <Archive />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirm({ kind: 'restore', q })} aria-label="Restore">
                    <RotateCcw />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setConfirm({ kind: 'delete', q })} aria-label="Delete">
                    <Trash2 className="text-rust-600" />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Lock className="size-4 shrink-0 text-navy-400" aria-label="Read-only" />
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Career assessment"
        title="Career questions"
        description={
          isSuperAdmin
            ? 'The core questions every student answers. Department admins can add up to three questions of their own.'
            : `Every student answers the core questions plus each department’s questions. You can add up to ${LIMITS.maxDeptCareerQuestions} for ${department?.code ?? 'your department'}; only you can edit them.`
        }
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={!canAdd}>
            <Plus /> {isSuperAdmin ? 'New core question' : `New question (${myActive}/${LIMITS.maxDeptCareerQuestions})`}
          </Button>
        }
      />
      {error && <ErrorState error={error} />}
      {isLoading ? (
        <Card><ListSkeleton /></Card>
      ) : (
        <div className="space-y-8">
          {!isSuperAdmin && (
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-navy-600 uppercase">Your department’s questions</h2>
              {mine.length ? (
                <div className="space-y-3">{mine.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}</div>
              ) : (
                <Card>
                  <EmptyState icon={MessageCircleQuestion} title="No department questions yet" description="Add a question that helps students discover your programs." compact />
                </Card>
              )}
            </section>
          )}
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-navy-600 uppercase">Core questions</h2>
            <div className="space-y-3">{system.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}</div>
          </section>
          {(isSuperAdmin ? questions.filter((q) => q.scope === 'department') : others).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-navy-600 uppercase">{isSuperAdmin ? 'Department questions' : 'Other departments’ questions'}</h2>
              <div className="space-y-3">
                {(isSuperAdmin ? questions.filter((q) => q.scope === 'department') : others).map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <QuestionDialog open={formOpen} onOpenChange={setFormOpen} question={editing} order={nextOrder} programs={pickable} />
      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{confirm?.kind === 'delete' ? 'Delete' : confirm?.kind === 'archive' ? 'Archive' : 'Restore'} this question?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.kind === 'delete'
              ? 'It is removed permanently. Past results keep the question text.'
              : confirm?.kind === 'archive'
                ? 'Students will no longer see it in the career assessment.'
                : 'Students will see it again in the career assessment.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: confirm?.kind === 'restore' ? 'default' : 'destructive' })} onClick={() => void run()}>
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
