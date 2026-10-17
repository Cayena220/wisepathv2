import { formatDate } from '@wisepath/shared';
import { ArrowRight, ClipboardCheck, Compass, Timer } from 'lucide-react-native';
import { View } from 'react-native';
import { DeptTag } from '../../components/cards';
import { Button, Card, EmptyState, Pill, Screen, SectionTitle, T } from '../../components/ui';
import { latestAttemptByAssessment, useCatalogView, useLatestResult, useMyAttempts } from '../../hooks/useStudentData';
import type { TabScreen } from '../../navigation/types';
import { useStudent } from '../../stores/session';
import { colors, space } from '../../theme';

export function AssessScreen({ navigation }: TabScreen<'Assess'>) {
  const { account } = useStudent();
  const catalog = useCatalogView();
  const latest = useLatestResult();
  const attempts = useMyAttempts();
  const lastByAssessment = latestAttemptByAssessment(attempts.data);

  // Fit checks for the student's top matches and chosen program first, then everything else.
  const priority = new Set([...(latest.data?.topProgramIds ?? []), account?.activeProgramId].filter(Boolean) as string[]);
  const available = catalog.assessments.filter((a) => catalog.programById.has(a.programId));
  const suggested = available.filter((a) => priority.has(a.programId));
  const others = available.filter((a) => !priority.has(a.programId));

  const AssessmentCard = ({ id }: { id: string }) => {
    const a = available.find((x) => x.id === id)!;
    const program = catalog.programById.get(a.programId);
    const last = lastByAssessment.get(a.id);
    return (
      <Card
        onPress={() => (last ? navigation.navigate('AttemptResult', { attemptId: last.id }) : navigation.navigate('ProgramAssessment', { assessmentId: a.id }))}
        style={{ gap: 8 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: colors.gold50, alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={20} color={colors.gold700} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="h3" numberOfLines={1}>
              {a.title}
            </T>
            <T variant="caption" color={colors.textMuted} numberOfLines={1}>
              {program?.code} · {a.questions.length} questions · pass {a.passingPercent}%
            </T>
          </View>
          {last ? <Pill label={`${last.scorePercent}% ${last.isFit ? 'Fit' : 'Not yet'}`} tone={last.isFit ? 'green' : 'gold'} /> : <Pill label="Not taken" />}
        </View>
        <DeptTag dept={program ? catalog.deptById.get(program.departmentId) : undefined} />
      </Card>
    );
  };

  return (
    <Screen>
      <T variant="h1">Assessments</T>
      <T variant="body" color={colors.textMuted}>
        Find your matches, then check your fit for a program.
      </T>

      <Card style={{ marginTop: space.xl, gap: space.md, padding: space.xl }} accent={colors.gold500}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' }}>
            <Compass size={24} color={colors.gold500} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="h2">Career assessment</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Timer size={14} color={colors.textMuted} />
              <T variant="caption" color={colors.textMuted}>
                {catalog.questions.length} questions · about 3 minutes
              </T>
            </View>
          </View>
        </View>
        <T variant="bodySm" color={colors.textMuted}>
          {account?.latestResult
            ? `Last taken ${formatDate(account.latestResult.completedAt)} — top match ${account.latestResult.bestProgramTitle}.`
            : 'Ranks every program for you using your answers and your profile.'}
        </T>
        <Button
          title={account?.latestResult ? 'Retake assessment' : 'Start assessment'}
          variant={account?.latestResult ? 'outline' : 'gold'}
          iconRight={ArrowRight}
          onPress={() => navigation.navigate('CareerAssessment')}
          disabled={!catalog.questions.length}
        />
      </Card>

      <SectionTitle title="Check your fit" />
      {suggested.length ? (
        <View style={{ gap: space.md }}>
          {suggested.map((a) => (
            <AssessmentCard key={a.id} id={a.id} />
          ))}
        </View>
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title={latest.data ? 'No fit check for your matches yet' : 'Take the career assessment first'}
            body={latest.data ? 'Your departments haven’t published a fit check for these programs yet. Try another one below.' : 'We’ll suggest fit checks for your top programs.'}
          />
        </Card>
      )}

      {others.length > 0 && (
        <>
          <SectionTitle title="More fit checks" />
          <View style={{ gap: space.md }}>
            {others.map((a) => (
              <AssessmentCard key={a.id} id={a.id} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
