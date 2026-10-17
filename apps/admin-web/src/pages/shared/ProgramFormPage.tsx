import {
  CAREER_INTEREST_OPTIONS,
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
  DIMENSIONS,
  LEARNING_GOALS_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  SHS_STRANDS,
  SKILL_LEVEL_OPTIONS,
  slugify,
  termLabel,
  type CurriculumTerm,
  type Difficulty,
  type MatchSignals,
  type Program,
} from '@wisepath/shared';
import { ArrowLeft, Lock, Plus, Save, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useActor, useAuth } from '@/auth/AuthProvider';
import { ErrorState, PageHeader } from '@/components/data/display';
import { TagInput } from '@/components/data/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui/primitives';
import { saveProgram, useInvalidateCatalog, useProgram, type ProgramInput } from '@/lib/data/catalog';
import { cn, errorMessage } from '@/lib/utils';

interface SubjectDraft {
  key: string;
  id?: string;
  code: string;
  title: string;
  units: number;
}
interface TermDraft {
  key: string;
  year: number;
  semester: 1 | 2 | 3;
  subjects: SubjectDraft[];
}
interface Draft {
  code: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  durationYears: number;
  tuitionListed: boolean;
  tuitionMin: string;
  tuitionMax: string;
  skills: string[];
  careerPaths: string[];
  curriculum: TermDraft[];
  dimensionAffinity: Record<string, number>;
  matchSignals: MatchSignals;
}

const key = () => Math.random().toString(36).slice(2, 10);
const emptySignals = (): MatchSignals => ({ careerInterests: {}, shsStrands: {}, learningGoals: {}, learningStyles: {}, skillLevels: {} });

const toDraft = (p: Program | null): Draft => ({
  code: p?.code ?? '',
  title: p?.title ?? '',
  description: p?.description ?? '',
  difficulty: p?.difficulty ?? 'intermediate',
  durationYears: p?.durationYears ?? 4,
  tuitionListed: Boolean(p?.tuitionPerTerm) || !p,
  tuitionMin: p?.tuitionPerTerm ? String(p.tuitionPerTerm.min) : '',
  tuitionMax: p?.tuitionPerTerm ? String(p.tuitionPerTerm.max) : '',
  skills: p?.skills ?? [],
  careerPaths: p?.careerPaths ?? [],
  curriculum: (p?.curriculum ?? [{ year: 1, semester: 1, subjects: [] }]).map((t) => ({
    key: key(),
    year: t.year,
    semester: t.semester,
    subjects: t.subjects.map((s) => ({ key: key(), id: s.id, code: s.code, title: s.title, units: s.units })),
  })),
  dimensionAffinity: { service: 0, technology: 0, justice: 0, ...(p?.dimensionAffinity ?? {}) },
  matchSignals: { ...emptySignals(), ...(p?.matchSignals ?? {}) },
});

/** Compact 0–N weight picker for one option. */
function WeightRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface/60">
      <span className={cn('text-[13px]', value > 0 ? 'font-medium text-navy-900' : 'text-navy-600')}>{label}</span>
      <div className="flex shrink-0 gap-0.5" role="radiogroup" aria-label={label}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'tabular size-7 rounded-md text-xs font-semibold transition',
              value === n ? (n === 0 ? 'bg-navy-200 text-navy-900' : 'bg-teal-600 text-white') : 'text-navy-400 hover:bg-navy-900/5',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function SignalGroup({
  title,
  options,
  values,
  max,
  onChange,
}: {
  title: string;
  options: readonly string[];
  values: Record<string, number>;
  max: number;
  onChange: (next: Record<string, number>) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold text-navy-900">{title}</div>
      <div className="divide-y divide-dashed rounded-xl border bg-white">
        {options.map((option) => (
          <WeightRow
            key={option}
            label={option}
            value={values[option] ?? 0}
            max={max}
            onChange={(v) => {
              const next = { ...values };
              if (v > 0) next[option] = v;
              else delete next[option];
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProgramFormPage() {
  const { programId } = useParams();
  const isNew = !programId;
  const actor = useActor();
  const { role, department } = useAuth();
  const navigate = useNavigate();
  const invalidate = useInvalidateCatalog();
  const { data: existing, isLoading } = useProgram(programId);
  const [draft, setDraft] = React.useState<Draft | null>(isNew ? toDraft(null) : null);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!isNew && existing && !draft) setDraft(toDraft(existing));
  }, [existing, isNew, draft]);

  if (role !== 'admin') return <Navigate to="/programs" replace />;
  if (!isNew && isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!isNew && !existing) return <ErrorState error={new Error('Program not found.')} />;
  if (existing && existing.departmentId !== actor.departmentId)
    return <ErrorState title="Read-only" error={new Error('Only the admin of the department that owns this program can edit it.')} />;
  if (!draft) return <Skeleton className="h-96 rounded-xl" />;

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [field]: value } : d));
  const setTerm = (termKey: string, update: (t: TermDraft) => TermDraft) =>
    set('curriculum', draft.curriculum.map((t) => (t.key === termKey ? update(t) : t)));

  const addTerm = () => {
    const last = draft.curriculum.at(-1);
    const next = last ? (last.semester === 1 ? { year: last.year, semester: 2 as const } : { year: last.year + 1, semester: 1 as const }) : { year: 1, semester: 1 as const };
    set('curriculum', [...draft.curriculum, { key: key(), ...next, subjects: [] }]);
  };

  const validate = (): ProgramInput | null => {
    const e: Record<string, string> = {};
    if (draft.code.trim().length < 2 || draft.code.trim().length > 20) e.code = '2–20 characters';
    if (draft.title.trim().length < 3) e.title = 'At least 3 characters';
    if (draft.description.length > 2000) e.description = 'At most 2000 characters';
    const min = Number(draft.tuitionMin);
    const max = Number(draft.tuitionMax || draft.tuitionMin);
    if (draft.tuitionListed && (!draft.tuitionMin || !Number.isFinite(min) || min < 0 || max < min)) e.tuition = 'Enter a valid range (min ≤ max)';
    const seen = new Set<string>();
    const curriculum: CurriculumTerm[] = draft.curriculum
      .map((t) => ({
        year: t.year,
        semester: t.semester,
        subjects: t.subjects
          .filter((s) => s.title.trim())
          .map((s) => {
            let id = s.id || slugify(s.title) || key();
            while (seen.has(id)) id = `${id}_${key().slice(0, 3)}`;
            seen.add(id);
            return { id, code: s.code.trim() || '—', title: s.title.trim(), units: Math.max(0, Math.min(12, Number(s.units) || 0)) };
          }),
      }))
      .filter((t) => t.subjects.length)
      .sort((a, b) => a.year - b.year || a.semester - b.semester);
    const termKeys = curriculum.map((t) => `${t.year}-${t.semester}`);
    if (new Set(termKeys).size !== termKeys.length) e.curriculum = 'Each year/semester can appear only once';
    if (curriculum.length > 24) e.curriculum = 'At most 24 terms';
    if (!DIMENSIONS.some((d) => (draft.dimensionAffinity[d] ?? 0) > 0) && !Object.values(draft.matchSignals).some((m) => Object.keys(m).length))
      e.matching = 'Set at least one affinity or profile signal so students can be matched to this program';
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields');
      return null;
    }
    return {
      code: draft.code.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      difficulty: draft.difficulty,
      durationYears: Math.round(draft.durationYears),
      tuitionPerTerm: draft.tuitionListed ? { min, max, currency: 'PHP' } : null,
      skills: draft.skills,
      careerPaths: draft.careerPaths,
      curriculum,
      dimensionAffinity: Object.fromEntries(DIMENSIONS.map((d) => [d, draft.dimensionAffinity[d] ?? 0]).filter(([, v]) => (v as number) > 0)),
      matchSignals: draft.matchSignals,
    };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input = validate();
    if (!input) return;
    setBusy(true);
    try {
      const id = await saveProgram(actor, input, existing ?? null);
      await invalidate();
      toast.success(isNew ? 'Program created' : 'Program saved');
      navigate(`/programs/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Link to={isNew ? '/programs' : `/programs/${programId}`} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-600 hover:text-navy-900">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <PageHeader
        eyebrow={department?.name}
        title={isNew ? 'New program' : `Edit ${existing?.code}`}
        description={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" /> Only you, as {department?.code} admin, can edit this program.
          </span>
        }
        actions={
          <Button type="submit" loading={busy}>
            <Save /> {isNew ? 'Create program' : 'Save changes'}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <Field label="Code" htmlFor="code" required error={errors.code}>
                  <Input id="code" value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="BSIT" />
                </Field>
                <Field label="Title" htmlFor="title" required error={errors.title}>
                  <Input id="title" value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Bachelor of Science in Information Technology" />
                </Field>
              </div>
              <Field label="Description" htmlFor="desc" error={errors.description} hint={`${draft.description.length}/2000`}>
                <Textarea id="desc" value={draft.description} onChange={(e) => set('description', e.target.value)} rows={3} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Difficulty" htmlFor="difficulty">
                  <NativeSelect id="difficulty" value={draft.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
                    <option value="beginner">Beginner-friendly</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </NativeSelect>
                </Field>
                <Field label="Duration (years)" htmlFor="years">
                  <Input id="years" type="number" min={1} max={6} value={draft.durationYears} onChange={(e) => set('durationYears', Number(e.target.value))} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tuition, skills & careers</CardTitle>
              <CardDescription>Tuition is used for the affordability bonus when a student shares their family income.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-[13px] text-navy-900">
                <input type="checkbox" checked={draft.tuitionListed} onChange={(e) => set('tuitionListed', e.target.checked)} className="size-4 accent-[#1F3350]" />
                Show an estimated tuition per term
              </label>
              {draft.tuitionListed && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum (₱)" htmlFor="tmin" error={errors.tuition}>
                    <Input id="tmin" type="number" min={0} step={500} value={draft.tuitionMin} onChange={(e) => set('tuitionMin', e.target.value)} placeholder="25000" />
                  </Field>
                  <Field label="Maximum (₱)" htmlFor="tmax">
                    <Input id="tmax" type="number" min={0} step={500} value={draft.tuitionMax} onChange={(e) => set('tuitionMax', e.target.value)} placeholder="40000" />
                  </Field>
                </div>
              )}
              <Field label="Skills students will learn" htmlFor="skills" hint="Press Enter after each one.">
                <TagInput id="skills" value={draft.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Programming" />
              </Field>
              <Field label="Career paths" htmlFor="careers">
                <TagInput id="careers" value={draft.careerPaths} onChange={(v) => set('careerPaths', v)} placeholder="e.g. Software Developer" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Curriculum</CardTitle>
                <CardDescription>Subjects by year and semester. Students track these in the app’s Progress tab.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTerm}>
                <Plus /> Add term
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.curriculum && <p className="text-sm font-medium text-rust-600">{errors.curriculum}</p>}
              {draft.curriculum.map((term) => (
                <div key={term.key} className="rounded-xl border bg-surface/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <NativeSelect className="h-9 w-28" value={term.year} onChange={(e) => setTerm(term.key, (t) => ({ ...t, year: Number(e.target.value) }))} aria-label="Year">
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      className="h-9 w-40"
                      value={term.semester}
                      onChange={(e) => setTerm(term.key, (t) => ({ ...t, semester: Number(e.target.value) as 1 | 2 | 3 }))}
                      aria-label="Semester"
                    >
                      <option value={1}>1st Semester</option>
                      <option value={2}>2nd Semester</option>
                      <option value={3}>Summer</option>
                    </NativeSelect>
                    <span className="text-xs text-navy-600">{termLabel(term.year, term.semester)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      onClick={() => set('curriculum', draft.curriculum.filter((t) => t.key !== term.key))}
                      aria-label="Remove term"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {term.subjects.map((s) => (
                      <div key={s.key} className="grid grid-cols-[90px_1fr_64px_32px] items-center gap-2">
                        <Input
                          className="h-9"
                          value={s.code}
                          placeholder="Code"
                          aria-label="Subject code"
                          onChange={(e) => setTerm(term.key, (t) => ({ ...t, subjects: t.subjects.map((x) => (x.key === s.key ? { ...x, code: e.target.value } : x)) }))}
                        />
                        <Input
                          className="h-9"
                          value={s.title}
                          placeholder="Subject title"
                          aria-label="Subject title"
                          onChange={(e) => setTerm(term.key, (t) => ({ ...t, subjects: t.subjects.map((x) => (x.key === s.key ? { ...x, title: e.target.value } : x)) }))}
                        />
                        <Input
                          className="h-9"
                          type="number"
                          min={0}
                          max={12}
                          value={s.units}
                          aria-label="Units"
                          onChange={(e) =>
                            setTerm(term.key, (t) => ({ ...t, subjects: t.subjects.map((x) => (x.key === s.key ? { ...x, units: Number(e.target.value) } : x)) }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setTerm(term.key, (t) => ({ ...t, subjects: t.subjects.filter((x) => x.key !== s.key) }))}
                          aria-label="Remove subject"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTerm(term.key, (t) => ({ ...t, subjects: [...t.subjects, { key: key(), code: '', title: '', units: 3 }] }))}
                    >
                      <Plus /> Add subject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matching — assessment affinity</CardTitle>
              <CardDescription>How strongly each career-assessment dimension points to this program (0 = not at all, 1 = fully).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {errors.matching && <p className="text-sm font-medium text-rust-600">{errors.matching}</p>}
              {DIMENSIONS.map((d) => (
                <div key={d}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-navy-900">{DIMENSION_LABELS[d]}</span>
                    <span className="tabular font-semibold text-teal-700">×{(draft.dimensionAffinity[d] ?? 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draft.dimensionAffinity[d] ?? 0}
                    onChange={(e) => set('dimensionAffinity', { ...draft.dimensionAffinity, [d]: Number(e.target.value) })}
                    className="mt-1 w-full accent-[#3E7A6C]"
                    aria-label={DIMENSION_LABELS[d]}
                  />
                  <div className="text-xs text-navy-600">{DIMENSION_DESCRIPTIONS[d]}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Matching — profile signals</CardTitle>
              <CardDescription>Points added when a student’s profile matches (weighted ×0.85). GAS students get +0.5 for every program automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SignalGroup
                title="Career interests"
                options={CAREER_INTEREST_OPTIONS}
                max={5}
                values={draft.matchSignals.careerInterests}
                onChange={(v) => set('matchSignals', { ...draft.matchSignals, careerInterests: v })}
              />
              <SignalGroup
                title="Senior high strand"
                options={SHS_STRANDS.filter((s) => s !== 'GAS' && s !== 'N/A')}
                max={5}
                values={draft.matchSignals.shsStrands}
                onChange={(v) => set('matchSignals', { ...draft.matchSignals, shsStrands: v })}
              />
              <SignalGroup
                title="Learning goals"
                options={LEARNING_GOALS_OPTIONS}
                max={5}
                values={draft.matchSignals.learningGoals}
                onChange={(v) => set('matchSignals', { ...draft.matchSignals, learningGoals: v })}
              />
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <SignalGroup
                  title="Learning style"
                  options={LEARNING_STYLE_OPTIONS}
                  max={3}
                  values={draft.matchSignals.learningStyles}
                  onChange={(v) => set('matchSignals', { ...draft.matchSignals, learningStyles: v })}
                />
                <SignalGroup
                  title="Skill level"
                  options={SKILL_LEVEL_OPTIONS}
                  max={3}
                  values={draft.matchSignals.skillLevels}
                  onChange={(v) => set('matchSignals', { ...draft.matchSignals, skillLevels: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="sticky bottom-4 z-10 mt-6 flex justify-end">
        <div className="rounded-2xl border bg-white/90 p-2 shadow-[var(--shadow-lift)] backdrop-blur">
          <Button type="submit" loading={busy} size="lg">
            <Save /> {isNew ? 'Create program' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
