import { formatTuition, termLabel } from '@wisepath/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { BookmarkCheck, Briefcase, ChevronDown, ChevronUp, ClipboardCheck, Clock, Wallet } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Button, Card, EmptyState, Header, Pill, Screen, SectionTitle, T, Tap } from '../../components/ui';
import { latestAttemptByAssessment, useCatalogView, useLatestResult, useMyAttempts } from '../../hooks/useStudentData';
import type { AppScreen } from '../../navigation/types';
import { setActiveProgram } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, radius, space } from '../../theme';

export function ProgramDetailScreen({ route, navigation }: AppScreen<'ProgramDetail'>) {
  const { programId } = route.params;
  const { uid, account } = useStudent();
  const catalog = useCatalogView();
  const latest = useLatestResult();
  const attempts = useMyAttempts();
  const [openYear, setOpenYear] = React.useState<number | null>(1);
  const [saving, setSaving] = React.useState(false);
  const program = catalog.programById.get(programId);

  if (!program)
    return (
      <Screen header={<Header />}>
        <EmptyState title="Program not available" body="This program may have been archived by its department." />
      </Screen>
    );

  const dept = catalog.deptById.get(program.departmentId);
  const match = latest.data?.rankings.find((r) => r.programId === program.id);
  const rank = latest.data ? latest.data.rankings.findIndex((r) => r.programId === program.id) : -1;
  const assessments = catalog.assessmentsFor(program.id);
  const lastAttempts = latestAttemptByAssessment(attempts.data);
  const following = account?.activeProgramId === program.id;
  const years = [...new Set(program.curriculum.map((t) => t.year))].sort();

  return (
    <Screen
      header={<Header title={program.code} />}
      footer={
        !following ? (
          <Button
            title="Follow this program"
            icon={BookmarkCheck}
            loading={saving}
            onPress={async () => {
              setSaving(true);
              await setActiveProgram(uid, program.id).catch(() => undefined);
              setSaving(false);
            }}
          />
        ) : undefined
      }
    >
      <LinearGradient colors={[colors.navy900, colors.teal700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space.xl, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dept?.color ?? colors.gold500 }} />
          <T variant="caption" color="rgba(255,255,255,0.75)" style={{ flex: 1 }}>
            {dept?.name}
          </T>
        </View>
        <T variant="h1" color={colors.white}>
          {program.title}
        </T>
        <T variant="bodySm" color="rgba(255,255,255,0.8)">
          {program.description}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {match && <Pill label={`${match.matchPercent}% match · #${rank + 1}`} tone="gold" />}
          {following && <Pill label="Following" tone="teal" />}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
        {[
          { icon: Clock, label: 'Duration', value: `${program.durationYears} years` },
          { icon: Wallet, label: 'Tuition / term', value: formatTuition(program.tuitionPerTerm) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} style={{ flex: 1, gap: 6 }}>
            <Icon size={18} color={colors.gold700} />
            <T variant="caption" color={colors.textMuted}>
              {label}
            </T>
            <T variant="bodySm" weight="semibold">
              {value}
            </T>
          </Card>
        ))}
      </View>

      {assessments.length > 0 && (
        <>
          <SectionTitle title="Check your fit" />
          {assessments.map((a) => {
            const last = lastAttempts.get(a.id);
            return (
              <Card key={a.id} style={{ gap: 10, marginBottom: space.md }} accent={colors.gold500}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ClipboardCheck size={20} color={colors.gold700} />
                  <T variant="h3" style={{ flex: 1 }}>
                    {a.title}
                  </T>
                  {last && <Pill label={`${last.scorePercent}% ${last.isFit ? 'Fit' : 'Not yet'}`} tone={last.isFit ? 'green' : 'gold'} />}
                </View>
                <T variant="bodySm" color={colors.textMuted}>
                  {a.description || `${a.questions.length} questions. Score ${a.passingPercent}% or more to be a fit.`}
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title={last ? 'Retake' : 'Start fit check'} small variant={last ? 'outline' : 'gold'} onPress={() => navigation.navigate('ProgramAssessment', { assessmentId: a.id })} />
                  {last && <Button title="See last result" small variant="ghost" onPress={() => navigation.navigate('AttemptResult', { attemptId: last.id })} />}
                </View>
              </Card>
            );
          })}
        </>
      )}

      <SectionTitle title="Skills you’ll learn" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {program.skills.map((s) => (
          <Pill key={s} label={s} tone="teal" />
        ))}
      </View>

      <SectionTitle title="Career paths" />
      <Card style={{ gap: 10 }}>
        {program.careerPaths.map((c) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Briefcase size={16} color={colors.gold700} />
            <T variant="bodySm">{c}</T>
          </View>
        ))}
      </Card>

      <SectionTitle title="Curriculum" />
      <View style={{ gap: space.md }}>
        {years.map((year) => {
          const open = openYear === year;
          return (
            <Card key={year} style={{ padding: 0 }}>
              <Tap onPress={() => setOpenYear(open ? null : year)} style={{ flexDirection: 'row', alignItems: 'center', padding: space.lg }} accessibilityRole="button">
                <T variant="h3" style={{ flex: 1 }}>
                  Year {year}
                </T>
                <T variant="caption" color={colors.textMuted} style={{ marginRight: 8 }}>
                  {program.curriculum.filter((t) => t.year === year).reduce((n, t) => n + t.subjects.length, 0)} subjects
                </T>
                {open ? <ChevronUp size={20} color={colors.navy600} /> : <ChevronDown size={20} color={colors.navy600} />}
              </Tap>
              {open &&
                program.curriculum
                  .filter((t) => t.year === year)
                  .map((term) => (
                    <View key={term.semester} style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 6 }}>
                      <T variant="label" color={colors.textMuted}>
                        {termLabel(term.year, term.semester)}
                      </T>
                      {term.subjects.map((s) => (
                        <View key={s.id} style={{ flexDirection: 'row', gap: 10 }}>
                          <T variant="caption" color={colors.textFaint} style={{ width: 64 }}>
                            {s.code}
                          </T>
                          <T variant="bodySm" style={{ flex: 1 }}>
                            {s.title}
                          </T>
                          <T variant="caption" color={colors.textFaint}>
                            {s.units}u
                          </T>
                        </View>
                      ))}
                    </View>
                  ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
