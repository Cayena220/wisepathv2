import { formatDate, type ProgramAssessmentAttempt } from '@wisepath/shared';
import { doc } from 'firebase/firestore';
import { CheckCircle2, CircleDashed, RotateCcw } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, EmptyState, Header, Loader, Pill, Ring, Screen, SectionTitle, T } from '../../components/ui';
import { db } from '../../lib/firebase';
import { useLiveDoc } from '../../lib/hooks';
import type { AppScreen } from '../../navigation/types';
import { colors, space } from '../../theme';

export function AttemptResultScreen({ route, navigation }: AppScreen<'AttemptResult'>) {
  const { attemptId, fresh } = route.params;
  const { data: attempt, loading } = useLiveDoc<ProgramAssessmentAttempt>(doc(db, 'programAssessmentAttempts', attemptId), `attempt:${attemptId}`);

  if (loading || attempt === undefined) return <Loader />;
  if (!attempt)
    return (
      <Screen header={<Header title="Fit check" />}>
        <EmptyState title="Result not found" />
      </Screen>
    );

  const earned = attempt.answers.reduce((s, a) => s + a.points, 0);
  const max = attempt.answers.reduce((s, a) => s + a.maxPoints, 0);

  return (
    <Screen
      header={<Header title="Fit check result" subtitle={formatDate(attempt.completedAt, true)} />}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Retake" icon={RotateCcw} variant="outline" onPress={() => navigation.replace('ProgramAssessment', { assessmentId: attempt.assessmentId })} style={{ flex: 1 }} />
          <Button title="View program" onPress={() => navigation.navigate('ProgramDetail', { programId: attempt.programId })} style={{ flex: 1 }} />
        </View>
      }
    >
      <Card style={{ alignItems: 'center', gap: 12, paddingVertical: space.xxl }}>
        <Ring value={attempt.scorePercent} size={140} stroke={13} color={attempt.isFit ? colors.teal600 : colors.gold500}>
          <T variant="display">{attempt.scorePercent}%</T>
        </Ring>
        <Pill label={attempt.isFit ? 'You’re a fit!' : 'Not yet a fit'} tone={attempt.isFit ? 'green' : 'gold'} />
        <T variant="h2" center>
          {attempt.programTitle}
        </T>
        <T variant="bodySm" color={colors.textMuted} center>
          {earned} of {max} points · {attempt.passingPercent}% needed to be a fit
        </T>
        {fresh && (
          <T variant="bodySm" color={colors.textMuted} center>
            {attempt.isFit
              ? 'Great match — this program suits how you think and work.'
              : 'Not quite yet. Review your answers below, explore the program, and try again any time.'}
          </T>
        )}
      </Card>

      <SectionTitle title="Your answers" />
      <View style={{ gap: space.md }}>
        {attempt.answers.map((a, i) => {
          const best = a.points >= a.maxPoints;
          return (
            <Card key={a.questionId} style={{ flexDirection: 'row', gap: 12 }}>
              {best ? <CheckCircle2 size={22} color={colors.teal600} /> : <CircleDashed size={22} color={colors.gold500} />}
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="bodySm" weight="semibold">
                  {i + 1}. {a.questionText}
                </T>
                <T variant="bodySm" color={colors.textMuted}>
                  {a.optionText}
                </T>
              </View>
              <T variant="bodySm" weight="bold" color={best ? colors.teal700 : colors.gold700}>
                {a.points}/{a.maxPoints}
              </T>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
