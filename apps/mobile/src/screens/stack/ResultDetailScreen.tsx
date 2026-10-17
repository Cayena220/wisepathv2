import { DIMENSION_LABELS, DIMENSIONS, formatDate, type CareerResult } from '@wisepath/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { BookmarkCheck, ChevronDown, ChevronUp, ClipboardCheck, MessageSquareQuote, PartyPopper, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { MatchCard } from '../../components/cards';
import { Button, Card, EmptyState, Header, Loader, Pill, ProgressBar, Ring, Screen, SectionTitle, T, Tap } from '../../components/ui';
import { useCatalogView } from '../../hooks/useStudentData';
import { errorText } from '../../lib/hooks';
import type { AppScreen } from '../../navigation/types';
import { getResult, setActiveProgram } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, radius, space } from '../../theme';

function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card style={{ padding: 0 }}>
      <Tap onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <T variant="h3" style={{ flex: 1 }}>
          {title}
        </T>
        {open ? <ChevronUp size={20} color={colors.navy600} /> : <ChevronDown size={20} color={colors.navy600} />}
      </Tap>
      {open && <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 10 }}>{children}</View>}
    </Card>
  );
}

export function ResultDetailScreen({ route, navigation }: AppScreen<'ResultDetail'>) {
  const { resultId, fresh } = route.params;
  const { uid, account } = useStudent();
  const catalog = useCatalogView();
  const [result, setResult] = React.useState<CareerResult | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getResult(resultId)
      .then(setResult)
      .catch((e) => {
        setError(errorText(e));
        setResult(null);
      });
  }, [resultId]);

  if (result === undefined) return <Loader label="Loading your result…" />;
  if (!result)
    return (
      <Screen header={<Header title="Result" />}>
        <EmptyState title="Result not found" body={error ?? 'It may have been deleted.'} />
      </Screen>
    );

  const best = result.top3[0];
  const fitCheck = best ? catalog.assessmentsFor(best.programId)[0] : undefined;
  const following = account?.activeProgramId === best?.programId;
  const maxDim = Math.max(1, ...DIMENSIONS.map((d) => result.dimensionScores?.[d] ?? 0));

  return (
    <Screen
      header={<Header title={fresh ? 'Your results' : 'Career assessment'} subtitle={formatDate(result.completedAt, true)} />}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!following && best && (
            <Button
              title="Follow this program"
              icon={BookmarkCheck}
              variant="outline"
              loading={saving}
              onPress={async () => {
                setSaving(true);
                await setActiveProgram(uid, best.programId).catch(() => undefined);
                setSaving(false);
              }}
              style={{ flex: 1 }}
            />
          )}
          {fitCheck && (
            <Button title="Check my fit" icon={ClipboardCheck} variant="gold" onPress={() => navigation.navigate('ProgramAssessment', { assessmentId: fitCheck.id })} style={{ flex: 1 }} />
          )}
        </View>
      }
    >
      {best && (
        <LinearGradient colors={[colors.navy900, '#24476A', colors.teal700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl, alignItems: 'center', gap: 12 }}>
          {fresh && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PartyPopper size={16} color={colors.gold100} />
              <T variant="label" color={colors.gold100}>
                Assessment complete
              </T>
            </View>
          )}
          <Ring value={best.matchPercent} size={120} stroke={11} color={colors.gold500} track="rgba(255,255,255,0.15)">
            <T variant="display" color={colors.white}>
              {best.matchPercent}%
            </T>
          </Ring>
          <T variant="label" color="rgba(255,255,255,0.7)">
            Your top match
          </T>
          <T variant="h2" color={colors.white} center>
            {best.programTitle}
          </T>
          {following && <Pill label="You’re following this program" tone="gold" />}
        </LinearGradient>
      )}

      <SectionTitle title="Your top 3" action={<T variant="caption" color={colors.textMuted}>Tap to explore</T>} />
      <View style={{ gap: space.md }}>
        {result.top3.map((row, i) => (
          <MatchCard key={row.programId} row={row} rank={i} dept={catalog.deptById.get(row.departmentId)} />
        ))}
      </View>

      <SectionTitle title="Why these matches" />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {result.strengths.map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.teal50, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Sparkles size={13} color={colors.teal700} />
              <T variant="caption" weight="semibold" color={colors.teal700}>
                {s}
              </T>
            </View>
          ))}
        </View>
        {result.guidanceSummary ? (
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md }}>
            <MessageSquareQuote size={18} color={colors.gold700} />
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="bodySm">{result.guidanceSummary}</T>
              <T variant="caption" color={colors.textFaint}>
                Guidance summary written from your answers and profile.
              </T>
            </View>
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          {DIMENSIONS.map((d) => (
            <View key={d} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="bodySm" color={colors.textMuted}>
                  {DIMENSION_LABELS[d]}
                </T>
                <T variant="bodySm" weight="semibold">
                  {result.dimensionScores?.[d] ?? 0}
                </T>
              </View>
              <ProgressBar value={((result.dimensionScores?.[d] ?? 0) / maxDim) * 100} color={colors.teal600} height={6} />
            </View>
          ))}
        </View>
      </Card>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Expandable title={`Full ranking (${result.rankings.length} programs)`}>
          {result.rankings.map((row, i) => (
            <Tap key={row.programId} onPress={() => navigation.navigate('ProgramDetail', { programId: row.programId })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T variant="caption" weight="bold" color={colors.textFaint} style={{ width: 22, textAlign: 'right' }}>
                {i + 1}
              </T>
              <T variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                {row.programTitle}
              </T>
              <T variant="bodySm" weight="semibold">
                {row.matchPercent}%
              </T>
            </Tap>
          ))}
          <T variant="caption" color={colors.textMuted}>
            Match % is each program’s share of your top-3 total — guidance, not a guarantee.
          </T>
        </Expandable>
        <Expandable title={`Your answers (${result.answers.length})`}>
          {result.answers.map((a, i) => (
            <View key={a.questionId} style={{ gap: 2 }}>
              <T variant="caption" color={colors.textMuted}>
                Q{i + 1}. {a.questionText}
              </T>
              <T variant="bodySm" weight="semibold" color={colors.teal700}>
                {a.optionText}
              </T>
            </View>
          ))}
        </Expandable>
      </View>
      {fresh && <Button title="Back to home" variant="ghost" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} style={{ marginTop: space.lg }} />}
    </Screen>
  );
}
