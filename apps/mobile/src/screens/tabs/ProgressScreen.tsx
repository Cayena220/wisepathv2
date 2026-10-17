import {
  computeCurriculumProgress,
  computeReadiness,
  termLabel,
  type StudentProgress,
  type SubjectState,
} from '@wisepath/shared';
import { Check, CheckCircle2, Circle, CircleDot, GraduationCap, Save } from 'lucide-react-native';
import * as React from 'react';
import { Alert, View } from 'react-native';
import { DeptTag } from '../../components/cards';
import { Button, Card, Chip, EmptyState, Loader, Pill, Ring, Screen, SectionTitle, T, Tap } from '../../components/ui';
import { useCatalogView, useLatestResult, useMyAttempts } from '../../hooks/useStudentData';
import { errorText, useLiveDoc } from '../../lib/hooks';
import type { TabScreen } from '../../navigation/types';
import { progressRef, saveProgress, setActiveProgram } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, radius, space } from '../../theme';

const NEXT_STATE: Record<string, SubjectState | undefined> = { none: 'ongoing', ongoing: 'completed', completed: undefined };

export function ProgressScreen({ navigation }: TabScreen<'Progress'>) {
  const { uid, account } = useStudent();
  const catalog = useCatalogView();
  const latest = useLatestResult();
  const attempts = useMyAttempts();
  const programId = account?.activeProgramId ?? null;
  const program = programId ? catalog.programById.get(programId) : undefined;
  const live = useLiveDoc<StudentProgress>(programId ? progressRef(uid, programId) : null, `progress:${uid}:${programId}`);
  const [status, setStatus] = React.useState<Record<string, SubjectState>>({});
  const [year, setYear] = React.useState(1);
  const [semester, setSemester] = React.useState(1);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (live.data === undefined || dirty) return;
    setStatus(live.data?.subjectStatus ?? {});
    setYear(live.data?.yearLevel ?? 1);
    setSemester(live.data?.semester ?? 1);
  }, [live.data, dirty]);

  if (catalog.status !== 'ready' && !catalog.programs.length) return <Loader label="Loading programs…" />;

  // ---------------------------------------------------------------- no program chosen yet
  if (!program) {
    const suggestions = (latest.data?.top3 ?? []).filter((row) => catalog.programById.has(row.programId));
    return (
      <Screen>
        <T variant="h1">Progress</T>
        <T variant="body" color={colors.textMuted}>
          Choose the program you want to follow.
        </T>
        {suggestions.length ? (
          <View style={{ gap: space.md, marginTop: space.xl }}>
            {suggestions.map((row, i) => (
              <Card key={row.programId} style={{ gap: 10 }}>
                <T variant="label" color={i === 0 ? colors.gold700 : colors.textMuted}>
                  {['Top match', '2nd match', '3rd match'][i]} · {row.matchPercent}%
                </T>
                <T variant="h3">{row.programTitle}</T>
                <Button title="Follow this program" small onPress={() => void setActiveProgram(uid, row.programId)} />
              </Card>
            ))}
          </View>
        ) : (
          <Card style={{ marginTop: space.xl }}>
            <EmptyState
              icon={GraduationCap}
              title="No program yet"
              body="Take the career assessment, or browse programs and pick one to follow."
              action={<Button title="Browse programs" small onPress={() => navigation.navigate('ProgramsBrowse', {})} />}
            />
          </Card>
        )}
      </Screen>
    );
  }

  const current = account?.profile?.studentStatus === 'current';
  const curriculum = computeCurriculumProgress(program.curriculum, status);
  const hasFit = (attempts.data ?? []).some((a) => a.programId === program.id);
  const readiness = computeReadiness({
    profileComplete: Boolean(account?.profileComplete),
    hasCareerResult: Boolean(account?.hasCareerResult),
    hasActiveProgram: true,
    hasFitAttempt: hasFit,
  });
  const dept = catalog.deptById.get(program.departmentId);
  const years = [...new Set(program.curriculum.map((t) => t.year))].sort();

  const toggle = (id: string) => {
    setStatus((prev) => {
      const next = { ...prev };
      const state = NEXT_STATE[prev[id] ?? 'none'];
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProgress({ uid, name: account?.profile?.name ?? '', program, yearLevel: year, semester, subjectStatus: status });
      setDirty(false);
    } catch (e) {
      Alert.alert('Could not save', errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={dirty ? <Button title="Save progress" icon={Save} variant="gold" onPress={() => void save()} loading={saving} /> : undefined}>
      <T variant="h1">Progress</T>
      <Card onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })} style={{ marginTop: space.lg, gap: 6 }}>
        <T variant="label" color={colors.gold700}>
          Following
        </T>
        <T variant="h3">{program.title}</T>
        <DeptTag dept={dept} />
      </Card>

      {!current ? (
        <>
          <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Ring value={readiness.percent} size={92} stroke={10} color={colors.gold500}>
              <T variant="h2">{readiness.percent}%</T>
            </Ring>
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="h3">College readiness</T>
              <T variant="bodySm" color={colors.textMuted}>
                Steps to get ready before enrolling in {program.code}.
              </T>
            </View>
          </Card>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {readiness.steps.map((step) => (
              <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.line }}>
                {step.done ? <CheckCircle2 size={22} color={colors.teal600} /> : <Circle size={22} color={colors.navy200} />}
                <T variant="body" weight={step.done ? 'medium' : 'regular'} color={step.done ? colors.navy900 : colors.textMuted} style={{ flex: 1 }}>
                  {step.label}
                </T>
                {!step.done && step.id === 'hasFitAttempt' && catalog.assessmentsFor(program.id)[0] && (
                  <Button title="Start" small onPress={() => navigation.navigate('ProgramAssessment', { assessmentId: catalog.assessmentsFor(program.id)[0].id })} />
                )}
                {!step.done && step.id === 'hasCareerResult' && <Button title="Start" small onPress={() => navigation.navigate('CareerAssessment')} />}
              </View>
            ))}
          </View>
          <SectionTitle title="What you’ll study" />
          {program.curriculum.slice(0, 2).map((term) => (
            <Card key={`${term.year}-${term.semester}`} style={{ marginBottom: space.md, gap: 6 }}>
              <T variant="label" color={colors.textMuted}>
                {termLabel(term.year, term.semester)}
              </T>
              {term.subjects.map((s) => (
                <T key={s.id} variant="bodySm">
                  • {s.title}
                </T>
              ))}
            </Card>
          ))}
          <Button title="See the full curriculum" variant="outline" onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })} />
        </>
      ) : live.loading ? (
        <Loader />
      ) : (
        <>
          <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Ring value={curriculum.percent} size={92} stroke={10} color={curriculum.graduationReady ? colors.green600 : colors.teal600}>
              <T variant="h2">{curriculum.percent}%</T>
            </Ring>
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="h3">{curriculum.graduationReady ? 'Ready to graduate!' : 'Overall progress'}</T>
              <T variant="bodySm" color={colors.textMuted}>
                {curriculum.completedUnits}/{curriculum.totalUnits} units · {curriculum.completedSubjects} done · {curriculum.ongoingSubjects} ongoing
              </T>
            </View>
          </Card>

          <SectionTitle title="Where are you now?" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(years.length ? years : [1, 2, 3, 4]).map((y) => (
              <Chip key={y} label={`Year ${y}`} selected={year === y} onPress={() => { setYear(y); setDirty(true); }} small />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[1, 2].map((s) => (
              <Chip key={s} label={s === 1 ? '1st semester' : '2nd semester'} selected={semester === s} onPress={() => { setSemester(s); setDirty(true); }} small />
            ))}
          </View>

          <SectionTitle title="Subjects" action={<T variant="caption" color={colors.textMuted}>Tap to update</T>} />
          {program.curriculum.map((term) => (
            <View key={`${term.year}-${term.semester}`} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <T variant="label" color={colors.textMuted}>
                  {termLabel(term.year, term.semester)}
                </T>
                {term.year === year && term.semester === semester && <Pill label="Current term" tone="gold" />}
              </View>
              <View style={{ gap: 8 }}>
                {term.subjects.map((s) => {
                  const state = status[s.id];
                  return (
                    <Tap
                      key={s.id}
                      onPress={() => toggle(s.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.title}, ${state ?? 'not started'}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        borderRadius: radius.md,
                        backgroundColor: state === 'completed' ? colors.teal50 : colors.white,
                        borderWidth: 1,
                        borderColor: state === 'completed' ? 'rgba(62,122,108,0.3)' : state === 'ongoing' ? colors.gold500 : colors.line,
                      }}
                    >
                      {state === 'completed' ? (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.teal600, alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={15} color={colors.white} strokeWidth={3} />
                        </View>
                      ) : state === 'ongoing' ? (
                        <CircleDot size={24} color={colors.gold700} />
                      ) : (
                        <Circle size={24} color={colors.navy200} />
                      )}
                      <View style={{ flex: 1 }}>
                        <T variant="bodySm" weight="medium" style={state === 'completed' ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>
                          {s.title}
                        </T>
                        <T variant="caption" color={colors.textFaint}>
                          {s.code} · {s.units} units
                        </T>
                      </View>
                      <T variant="caption" weight="semibold" color={state === 'completed' ? colors.teal700 : state === 'ongoing' ? colors.gold700 : colors.textFaint}>
                        {state === 'completed' ? 'Done' : state === 'ongoing' ? 'Ongoing' : 'To take'}
                      </T>
                    </Tap>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      )}

      <Button
        title="Follow a different program"
        variant="ghost"
        small
        onPress={() => navigation.navigate('ProgramsBrowse', {})}
        style={{ marginTop: space.lg, alignSelf: 'center' }}
      />
    </Screen>
  );
}
