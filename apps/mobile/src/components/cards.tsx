import { formatDate, formatTuition, type CareerResult, type Department, type Program, type ProgramAssessmentAttempt, type RankedProgram } from '@wisepath/shared';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ClipboardCheck, Trophy } from 'lucide-react-native';
import { View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Card, Pill, Ring, T, Tap } from './ui';

export const RANK_LABELS = ['Top match', '2nd match', '3rd match'];

export function DeptTag({ dept }: { dept?: Department }) {
  if (!dept) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dept.color }} />
      <T variant="caption" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
        {dept.name}
      </T>
    </View>
  );
}

/** One of the top-3 matches; tapping opens the program. */
export function MatchCard({ row, rank, dept }: { row: RankedProgram; rank: number; dept?: Department }) {
  const navigation = useNavigation();
  const top = rank === 0;
  return (
    <Card
      onPress={() => navigation.navigate('ProgramDetail', { programId: row.programId })}
      accent={top ? colors.gold500 : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <Ring value={row.matchPercent} size={58} stroke={6} color={top ? colors.gold500 : colors.teal600}>
        <T variant="bodySm" weight="bold">
          {row.matchPercent}%
        </T>
      </Ring>
      <View style={{ flex: 1, gap: 3 }}>
        <T variant="label" color={top ? colors.gold700 : colors.textMuted}>
          {RANK_LABELS[rank] ?? `#${rank + 1}`}
        </T>
        <T variant="h3" numberOfLines={2}>
          {row.programTitle}
        </T>
        <DeptTag dept={dept} />
      </View>
      <ChevronRight size={20} color={colors.navy400} />
    </Card>
  );
}

export function ResultHistoryCard({ result, onLongPress }: { result: CareerResult; onLongPress?: () => void }) {
  const navigation = useNavigation();
  const best = result.top3?.[0];
  return (
    <Tap onPress={() => navigation.navigate('ResultDetail', { resultId: result.id })} onLongPress={onLongPress} accessibilityRole="button">
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.teal50, alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={20} color={colors.teal700} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="caption" color={colors.textMuted}>
              {formatDate(result.completedAt, true)}
            </T>
            <T variant="h3" numberOfLines={1}>
              {best?.programTitle ?? 'Career assessment'}
            </T>
          </View>
          {result.isLatest && <Pill label="Latest" tone="teal" />}
          <ChevronRight size={20} color={colors.navy400} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {result.top3?.map((row, i) => (
            <View key={row.programId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: i === 0 ? colors.gold50 : colors.surface, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
              <T variant="caption" weight="bold" color={i === 0 ? colors.gold700 : colors.navy700}>
                {row.matchPercent}%
              </T>
              <T variant="caption" color={colors.navy700}>
                {row.programCode}
              </T>
            </View>
          ))}
        </View>
      </Card>
    </Tap>
  );
}

export function AttemptRow({ attempt }: { attempt: ProgramAssessmentAttempt }) {
  const navigation = useNavigation();
  return (
    <Card onPress={() => navigation.navigate('AttemptResult', { attemptId: attempt.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: attempt.isFit ? colors.green100 : colors.amber100, alignItems: 'center', justifyContent: 'center' }}>
        <ClipboardCheck size={20} color={attempt.isFit ? colors.green600 : colors.amber600} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="h3" numberOfLines={1}>
          {attempt.programTitle}
        </T>
        <T variant="caption" color={colors.textMuted}>
          {formatDate(attempt.completedAt, true)}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T variant="h3" color={attempt.isFit ? colors.green600 : colors.amber600}>
          {attempt.scorePercent}%
        </T>
        <T variant="caption" color={colors.textMuted}>
          {attempt.isFit ? 'Fit' : 'Not yet'}
        </T>
      </View>
    </Card>
  );
}

export function ProgramRow({ program, dept, match }: { program: Program; dept?: Department; match?: number }) {
  const navigation = useNavigation();
  return (
    <Card onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="caption" weight="semibold" color={colors.gold700}>
            {program.code}
          </T>
          <T variant="h3">{program.title}</T>
        </View>
        {match != null && <Pill label={`${match}% match`} tone="teal" />}
      </View>
      <DeptTag dept={dept} />
      <T variant="caption" color={colors.textMuted}>
        {program.durationYears} years · {formatTuition(program.tuitionPerTerm)} per term
      </T>
    </Card>
  );
}

export function StatTile({ label, value, tone = colors.navy900 }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.line }}>
      <T variant="h2" color={tone}>
        {value}
      </T>
      <T variant="caption" color={colors.textMuted}>
        {label}
      </T>
    </View>
  );
}
