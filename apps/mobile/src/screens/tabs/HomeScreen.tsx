import { firstName } from '@wisepath/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ClipboardCheck, Compass, GraduationCap, RefreshCw, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Avatar } from '../../components/brand';
import { MatchCard } from '../../components/cards';
import { Button, Card, Ring, Screen, SectionTitle, T, Tap } from '../../components/ui';
import { latestAttemptByAssessment, useCatalogView, useLatestResult, useMyAttempts } from '../../hooks/useStudentData';
import type { TabScreen } from '../../navigation/types';
import { useStudent } from '../../stores/session';
import { colors, radius, space } from '../../theme';

export function HomeScreen({ navigation }: TabScreen<'Home'>) {
  const { account } = useStudent();
  const catalog = useCatalogView();
  const latest = useLatestResult();
  const attempts = useMyAttempts();
  const [refreshing, setRefreshing] = React.useState(false);
  const result = latest.data;
  const best = result?.top3?.[0];
  const bestAssessment = best ? catalog.assessmentsFor(best.programId)[0] : undefined;
  const bestAttempt = bestAssessment ? latestAttemptByAssessment(attempts.data).get(bestAssessment.id) : undefined;
  const name = firstName(account?.profile?.name ?? account?.displayName);

  const steps = [
    {
      done: Boolean(result),
      icon: Compass,
      title: result ? 'Retake the career assessment' : 'Take the career assessment',
      body: result ? 'Your interests changed? Get fresh matches.' : `${catalog.questions.length || 'A few'} quick questions — about 3 minutes.`,
      onPress: () => navigation.navigate('CareerAssessment'),
    },
    {
      done: Boolean(bestAttempt),
      icon: ClipboardCheck,
      title: bestAssessment ? `Check your fit for ${best?.programCode}` : 'Check your program fit',
      body: bestAttempt ? `Last score ${bestAttempt.scorePercent}% — ${bestAttempt.isFit ? 'you’re a fit!' : 'try again any time'}` : 'A short quiz about a specific program.',
      onPress: () => (bestAssessment ? navigation.navigate('ProgramAssessment', { assessmentId: bestAssessment.id }) : navigation.navigate('Assess')),
    },
    {
      done: Boolean(account?.activeProgramId),
      icon: GraduationCap,
      title: 'Track your progress',
      body: account?.activeProgramId ? 'See your checklist and subjects.' : 'Choose a program to follow.',
      onPress: () => navigation.navigate('Progress'),
    },
  ];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.gold700}
          onRefresh={async () => {
            setRefreshing(true);
            await catalog.reload();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T variant="bodySm" color={colors.textMuted}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </T>
          <T variant="h1">Hi, {name}</T>
        </View>
        <Tap onPress={() => navigation.navigate('Profile')} accessibilityLabel="Open profile">
          <Avatar name={account?.displayName ?? name} size={46} />
        </Tap>
      </View>

      {result && best ? (
        <Tap onPress={() => navigation.navigate('ResultDetail', { resultId: result.id })} style={{ marginTop: space.xl }} accessibilityRole="button" accessibilityLabel="Open your latest result">
          <LinearGradient colors={[colors.navy900, '#24476A', colors.teal700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Ring value={best.matchPercent} size={86} stroke={9} color={colors.gold500} track="rgba(255,255,255,0.15)">
                <T variant="h2" color={colors.white}>
                  {best.matchPercent}%
                </T>
              </Ring>
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="label" color={colors.gold100}>
                  Your top match
                </T>
                <T variant="h2" color={colors.white} numberOfLines={3}>
                  {best.programTitle}
                </T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg }}>
              <T variant="bodySm" color="rgba(255,255,255,0.75)">
                See why, and your full ranking
              </T>
              <ArrowRight size={18} color={colors.gold100} />
            </View>
          </LinearGradient>
        </Tap>
      ) : (
        <Card style={{ marginTop: space.xl, gap: space.md, padding: space.xl }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.gold50, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={26} color={colors.gold700} />
          </View>
          <T variant="h2">Discover your best-fit programs</T>
          <T variant="body" color={colors.textMuted}>
            Answer a few questions about what you enjoy. WisePath combines them with your profile to rank all {catalog.programs.length || ''} programs and show your top 3.
          </T>
          <Button title="Start the career assessment" variant="gold" iconRight={ArrowRight} onPress={() => navigation.navigate('CareerAssessment')} />
        </Card>
      )}

      {result && result.top3.length > 1 && (
        <>
          <SectionTitle title="Your top 3" action={<T variant="caption" color={colors.textMuted}>Tap to explore</T>} />
          <View style={{ gap: space.md }}>
            {result.top3.map((row, i) => (
              <MatchCard key={row.programId} row={row} rank={i} dept={catalog.deptById.get(row.departmentId)} />
            ))}
          </View>
        </>
      )}

      <SectionTitle title="Next steps" />
      <View style={{ gap: space.md }}>
        {steps.map((step) => (
          <Card key={step.title} onPress={step.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: step.done ? colors.green100 : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <step.icon size={22} color={step.done ? colors.green600 : colors.navy700} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="h3">{step.title}</T>
              <T variant="bodySm" color={colors.textMuted}>
                {step.body}
              </T>
            </View>
            {step.done ? <RefreshCw size={16} color={colors.navy400} /> : <ArrowRight size={18} color={colors.gold700} />}
          </Card>
        ))}
      </View>

      <SectionTitle
        title="Explore by department"
        action={
          <Tap onPress={() => navigation.navigate('ProgramsBrowse', {})}>
            <T variant="bodySm" weight="semibold" color={colors.teal700}>
              All programs
            </T>
          </Tap>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.xl }} style={{ marginHorizontal: -space.xl, paddingLeft: space.xl }}>
        {catalog.departments.map((dept) => {
          const count = catalog.programs.filter((p) => p.departmentId === dept.id).length;
          return (
            <Card key={dept.id} onPress={() => navigation.navigate('ProgramsBrowse', { departmentId: dept.id })} style={{ width: 200, gap: 8 }}>
              <View style={{ height: 6, width: 36, borderRadius: 3, backgroundColor: dept.color }} />
              <T variant="caption" weight="bold" color={colors.textMuted}>
                {dept.code}
              </T>
              <T variant="h3" numberOfLines={2}>
                {dept.name}
              </T>
              <T variant="caption" color={colors.textMuted}>
                {count} program{count === 1 ? '' : 's'}
              </T>
            </Card>
          );
        })}
      </ScrollView>
      {catalog.error && (
        <T variant="caption" color={colors.textMuted} style={{ marginTop: space.md }}>
          {catalog.error}
        </T>
      )}
    </Screen>
  );
}
