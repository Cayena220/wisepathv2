import type { Department, Program } from '@wisepath/shared';
import { ArrowRightLeft, Building2, ChevronDown, ChevronUp, GripVertical, Save, Undo2 } from 'lucide-react';
import * as React from 'react';
import { Link, useBlocker } from 'react-router';
import { toast } from 'sonner';
import { useActor } from '@/auth/AuthProvider';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/data/display';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/overlays';
import { Badge, Card, NativeSelect } from '@/components/ui/primitives';
import {
  saveArrangement,
  useDepartments,
  useInvalidateCatalog,
  useProgramAssessments,
  usePrograms,
  type CatalogArrangement,
} from '@/lib/data/catalog';
import { cn, errorMessage, pluralize } from '@/lib/utils';

// ---------------------------------------------------------------- arrangement helpers

const fromServer = (departments: Department[], programs: Program[]): CatalogArrangement => ({
  departmentIds: departments.map((d) => d.id),
  programIds: Object.fromEntries(departments.map((d) => [d.id, programs.filter((p) => p.departmentId === d.id).map((p) => p.id)])),
});

/** Keeps a draft valid when the catalog changes underneath it (a program or department added or removed). */
const reconcile = (draft: CatalogArrangement, server: CatalogArrangement): CatalogArrangement => {
  const known = new Set(server.departmentIds);
  const departmentIds = [
    ...draft.departmentIds.filter((id) => known.has(id)),
    ...server.departmentIds.filter((id) => !draft.departmentIds.includes(id)),
  ];
  const existing = new Set(Object.values(server.programIds).flat());
  const placed = new Set<string>();
  const programIds: Record<string, string[]> = {};
  for (const id of departmentIds) {
    programIds[id] = (draft.programIds[id] ?? []).filter((p) => existing.has(p) && !placed.has(p));
    programIds[id].forEach((p) => placed.add(p));
  }
  for (const id of server.departmentIds) {
    for (const p of server.programIds[id]) if (!placed.has(p)) programIds[id].push(p);
  }
  return { departmentIds, programIds };
};

/** Moves list[from] so it lands before the item that was at index `to` (to = length appends). */
const moveItem = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, item);
  return next;
};

const deptOf = (a: CatalogArrangement, programId: string) => a.departmentIds.find((d) => a.programIds[d]?.includes(programId));

const placeProgram = (a: CatalogArrangement, programId: string, toDept: string, toIndex: number): CatalogArrangement => {
  const fromDept = deptOf(a, programId);
  if (!fromDept) return a;
  if (fromDept === toDept) {
    const list = a.programIds[toDept];
    return { ...a, programIds: { ...a.programIds, [toDept]: moveItem(list, list.indexOf(programId), toIndex) } };
  }
  const target = [...a.programIds[toDept]];
  target.splice(Math.min(toIndex, target.length), 0, programId);
  return { ...a, programIds: { ...a.programIds, [fromDept]: a.programIds[fromDept].filter((p) => p !== programId), [toDept]: target } };
};

/** Index of the row the pointer is above (by row midpoint); rows.length when below the last one. */
const indexAt = (container: HTMLElement, selector: string, clientY: number) => {
  const rows = [...container.querySelectorAll<HTMLElement>(selector)];
  const index = rows.findIndex((row) => {
    const box = row.getBoundingClientRect();
    return clientY < box.top + box.height / 2;
  });
  return index === -1 ? rows.length : index;
};

type Drag = { kind: 'dept' | 'program'; id: string };
type Drop = { kind: 'dept'; index: number } | { kind: 'program'; deptId: string; index: number };

function DropLine({ position }: { position: 'top' | 'bottom' }) {
  return <div aria-hidden className={cn('pointer-events-none absolute right-3 left-3 z-10 h-0.5 rounded-full bg-gold-500', position === 'top' ? '-top-px' : '-bottom-px')} />;
}

// ---------------------------------------------------------------- page

export function ArrangeCatalogPage() {
  const actor = useActor();
  const { departments, byId, isLoading: deptsLoading, error: deptsError } = useDepartments();
  const programs = usePrograms(null);
  const assessments = useProgramAssessments(null);
  const invalidate = useInvalidateCatalog();

  const [draft, setDraft] = React.useState<CatalogArrangement | null>(null);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [drop, setDrop] = React.useState<Drop | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const programList = React.useMemo(() => programs.data ?? [], [programs.data]);
  const programById = React.useMemo(() => new Map(programList.map((p) => [p.id, p])), [programList]);
  const server = React.useMemo(() => fromServer(departments, programList), [departments, programList]);
  const view = draft ? reconcile(draft, server) : server;
  const dirty = draft !== null && JSON.stringify(view) !== JSON.stringify(server);
  const update = (change: (a: CatalogArrangement) => CatalogArrangement) => setDraft(change(view));

  const moves = programList
    .map((p) => ({ program: p, to: deptOf(view, p.id) }))
    .filter((m): m is { program: Program; to: string } => Boolean(m.to) && m.to !== m.program.departmentId);

  // Unsaved changes: confirm before leaving the page or closing the tab.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  React.useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Leave without saving your new arrangement?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveArrangement(actor, view, departments, programList, assessments.data ?? []);
      await invalidate();
      setDraft(null);
      toast.success(result.moved ? `Saved — ${pluralize(result.moved, 'program')} moved to a new department` : 'New order saved');
    } catch (error) {
      await invalidate();
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  // ------------------------------------------------ drag and drop (HTML5; buttons and selects cover touch and keyboard)
  const endDrag = () => {
    setDrag(null);
    setDrop(null);
  };
  const startDrag = (event: React.DragEvent, next: Drag, image?: HTMLElement | null) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', next.id);
    if (image) event.dataTransfer.setDragImage(image, 24, 24);
    setDrag(next);
  };
  const canReceive = (deptId: string, programId: string) => byId.get(deptId)?.status === 'active' || deptOf(view, programId) === deptId;

  const overDeptList = (event: React.DragEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'dept') return;
    event.preventDefault();
    setDrop({ kind: 'dept', index: indexAt(event.currentTarget, ':scope > [data-dept]', event.clientY) });
  };
  const overDeptCard = (event: React.DragEvent, deptId: string) => {
    if (drag?.kind !== 'program' || !canReceive(deptId, drag.id)) return;
    event.preventDefault();
    setDrop({ kind: 'program', deptId, index: view.programIds[deptId].length });
  };
  const overProgramList = (event: React.DragEvent<HTMLUListElement>, deptId: string) => {
    if (drag?.kind !== 'program' || !canReceive(deptId, drag.id)) return;
    event.preventDefault();
    event.stopPropagation();
    setDrop({ kind: 'program', deptId, index: indexAt(event.currentTarget, ':scope > [data-program]', event.clientY) });
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (drag?.kind === 'dept' && drop?.kind === 'dept') {
      update((a) => ({ ...a, departmentIds: moveItem(a.departmentIds, a.departmentIds.indexOf(drag.id), drop.index) }));
    } else if (drag?.kind === 'program' && drop?.kind === 'program') {
      update((a) => placeProgram(a, drag.id, drop.deptId, drop.index));
    }
    endDrag();
  };

  const loading = deptsLoading || programs.isLoading;
  const error = deptsError ?? programs.error;
  const activeDepartments = view.departmentIds.map((id) => byId.get(id)).filter((d): d is Department => d?.status === 'active');

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Arrange catalog"
        description="Drag departments and programs into the order students see them in the app, or move a program to another department. Each program’s details are still edited by its department’s admin."
      />

      {error ? (
        <ErrorState error={error} />
      ) : loading ? (
        <Card>
          <ListSkeleton rows={8} />
        </Card>
      ) : !departments.length ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Create departments first, then come back to arrange them."
            action={
              <Link to="/departments" className={buttonVariants({ size: 'sm' })}>
                Go to Departments
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="max-w-4xl space-y-4" onDragOver={overDeptList} onDrop={onDrop}>
          {view.departmentIds.map((deptId, deptIndex) => {
            const dept = byId.get(deptId)!;
            const ids = view.programIds[deptId] ?? [];
            const archived = dept.status !== 'active';
            const showLine = drop?.kind === 'dept' && drag?.id !== deptId;
            return (
              <Card
                key={deptId}
                data-dept={deptId}
                id={`dept-${deptId}`}
                className={cn('relative overflow-visible', drag?.id === deptId && 'opacity-50', archived && 'bg-surface/70')}
                onDragOver={(e) => overDeptCard(e, deptId)}
              >
                {showLine && drop.index === deptIndex && <div aria-hidden className="pointer-events-none absolute -top-[9px] right-0 left-0 h-0.5 rounded-full bg-gold-500" />}
                {showLine && deptIndex === view.departmentIds.length - 1 && drop.index === view.departmentIds.length && (
                  <div aria-hidden className="pointer-events-none absolute right-0 -bottom-[9px] left-0 h-0.5 rounded-full bg-gold-500" />
                )}
                <div className="h-1.5 rounded-t-xl" style={{ background: dept.color }} />
                <div
                  draggable
                  onDragStart={(e) => startDrag(e, { kind: 'dept', id: deptId }, document.getElementById(`dept-${deptId}`))}
                  onDragEnd={endDrag}
                  className="flex cursor-grab items-center gap-2 border-b px-3 py-2.5 active:cursor-grabbing"
                >
                  <GripVertical className="size-4 shrink-0 text-navy-400" aria-hidden />
                  <span className="tabular w-5 shrink-0 text-center text-xs font-semibold text-navy-400">{deptIndex + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-navy-900">
                      <span className="mr-1.5 text-xs font-bold tracking-wider text-navy-600">{dept.code}</span>
                      {dept.name}
                    </div>
                    <div className="text-xs text-navy-600">
                      {pluralize(ids.length, 'program')}
                      {archived && ' · archived — programs can be moved out, not in'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${dept.code} up`}
                    disabled={deptIndex === 0}
                    onClick={() => update((a) => ({ ...a, departmentIds: moveItem(a.departmentIds, deptIndex, deptIndex - 1) }))}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${dept.code} down`}
                    disabled={deptIndex === view.departmentIds.length - 1}
                    onClick={() => update((a) => ({ ...a, departmentIds: moveItem(a.departmentIds, deptIndex, deptIndex + 2) }))}
                  >
                    <ChevronDown />
                  </Button>
                </div>

                <ul className="relative divide-y" onDragOver={(e) => overProgramList(e, deptId)}>
                  {ids.map((programId, index) => {
                    const program = programById.get(programId)!;
                    const from = program.departmentId !== deptId ? byId.get(program.departmentId) : null;
                    const lineHere = drop?.kind === 'program' && drop.deptId === deptId && drag?.id !== programId;
                    return (
                      <li
                        key={programId}
                        data-program={programId}
                        draggable
                        onDragStart={(e) => startDrag(e, { kind: 'program', id: programId })}
                        onDragEnd={endDrag}
                        className={cn(
                          'relative flex cursor-grab items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gold-50/40 active:cursor-grabbing',
                          drag?.id === programId && 'opacity-40',
                          from && 'bg-gold-50/60',
                        )}
                      >
                        {lineHere && drop.index === index && <DropLine position="top" />}
                        {lineHere && index === ids.length - 1 && drop.index === ids.length && <DropLine position="bottom" />}
                        <GripVertical className="size-4 shrink-0 text-navy-300" aria-hidden />
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                          <div className="min-w-0 flex-1 basis-40">
                            <Link to={`/programs/${programId}`} draggable={false} className="block truncate text-sm font-medium text-navy-900 hover:underline">
                              {program.title}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-navy-600">
                              {program.code}
                              {program.status !== 'active' && <Badge>Archived</Badge>}
                              {from && (
                                <Badge tone="gold">
                                  <ArrowRightLeft /> Moving from {from.code}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <NativeSelect
                              aria-label={`Department for ${program.code}`}
                              className="h-8 w-28 text-[13px] sm:w-36"
                              value={deptId}
                              onChange={(e) => update((a) => placeProgram(a, programId, e.target.value, a.programIds[e.target.value]?.length ?? 0))}
                            >
                              {archived && <option value={deptId}>{dept.code} (archived)</option>}
                              {activeDepartments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.code}
                                </option>
                              ))}
                            </NativeSelect>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${program.code} up`}
                              disabled={index === 0}
                              onClick={() => update((a) => placeProgram(a, programId, deptId, index - 1))}
                            >
                              <ChevronUp />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${program.code} down`}
                              disabled={index === ids.length - 1}
                              onClick={() => update((a) => placeProgram(a, programId, deptId, index + 2))}
                            >
                              <ChevronDown />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {!ids.length && (
                    <li
                      className={cn(
                        'px-4 py-5 text-center text-[13px] text-navy-400',
                        drop?.kind === 'program' && drop.deptId === deptId && 'bg-gold-50 text-gold-700',
                      )}
                    >
                      {archived ? 'No programs' : 'No programs yet — drop one here'}
                    </li>
                  )}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-4 z-20 mt-6 flex max-w-4xl flex-wrap items-center gap-3 rounded-xl border border-gold-500/30 bg-white/95 p-3 pl-4 shadow-lg backdrop-blur">
          <div className="text-sm text-navy-900">
            <span className="font-semibold">Unsaved changes</span>
            {moves.length > 0 && <span className="text-navy-600"> · {pluralize(moves.length, 'program')} changing department</span>}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setDraft(null)}>
              <Undo2 /> Discard
            </Button>
            <Button size="sm" loading={saving} disabled={assessments.isLoading} onClick={() => (moves.length ? setConfirming(true) : void save())}>
              <Save /> Save
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirming} onOpenChange={(open) => !saving && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogTitle>Move {pluralize(moves.length, 'program')} to another department?</AlertDialogTitle>
          <AlertDialogDescription>
            Each program moves with its program assessments. The new department’s admin can then edit it, and the old one can’t. Past student results
            and fit checks stay recorded under the department they were made in.
          </AlertDialogDescription>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border bg-surface/50 p-3 text-sm">
            {moves.map(({ program, to }) => (
              <li key={program.id} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium text-navy-900">{program.code}</span>
                <span className="text-navy-600">
                  {byId.get(program.departmentId)?.code ?? program.departmentId} → {byId.get(to)?.code ?? to}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants()}
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {saving ? 'Saving…' : 'Move and save'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
