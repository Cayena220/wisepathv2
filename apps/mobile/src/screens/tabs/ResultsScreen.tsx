import type { CareerResult } from '@wisepath/shared';
import { ClipboardCheck, Trophy } from 'lucide-react-native';
import * as React from 'react';
import { Alert, View } from 'react-native';
import { AttemptRow, ResultHistoryCard } from '../../components/cards';
import { Button, Card, Chip, EmptyState, ErrorBanner, Loader, Screen, T } from '../../components/ui';
import { useMyAttempts, useMyResults } from '../../hooks/useStudentData';
import { errorText } from '../../lib/hooks';
import type { TabScreen } from '../../navigation/types';
import { deleteResult } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, space } from '../../theme';

export function ResultsScreen({ navigation }: TabScreen<'Results'>) {
  const { uid } = useStudent();
  const results = useMyResults();
  const attempts = useMyAttempts();
  const [tab, setTab] = React.useState<'career' | 'fit'>('career');

  const confirmDelete = (result: CareerResult) =>
    Alert.alert('Delete this result?', 'It will be removed from your history. Department admins will no longer see it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteResult(uid, result, results.data ?? []).catch((e) => Alert.alert('Could not delete', errorText(e))),
      },
    ]);

  return (
    <Screen>
      <T variant="h1">Results</T>
      <T variant="body" color={colors.textMuted}>
        Tap any result to see the full breakdown.
      </T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: space.lg, marginBottom: space.lg }}>
        <Chip label={`Career results${results.data ? ` (${results.data.length})` : ''}`} selected={tab === 'career'} onPress={() => setTab('career')} />
        <Chip label={`Fit checks${attempts.data ? ` (${attempts.data.length})` : ''}`} selected={tab === 'fit'} onPress={() => setTab('fit')} />
      </View>

      {tab === 'career' ? (
        results.loading ? (
          <Loader />
        ) : results.error ? (
          <ErrorBanner message={errorText(results.error)} />
        ) : !results.data?.length ? (
          <Card>
            <EmptyState
              icon={Trophy}
              title="No results yet"
              body="Take the career assessment to see your top program matches."
              action={<Button title="Start assessment" variant="gold" small onPress={() => navigation.navigate('CareerAssessment')} />}
            />
          </Card>
        ) : (
          <View style={{ gap: space.md }}>
            {results.data.map((r) => (
              <ResultHistoryCard key={r.id} result={r} onLongPress={() => confirmDelete(r)} />
            ))}
            <T variant="caption" color={colors.textFaint} center style={{ marginTop: space.sm }}>
              Press and hold a result to delete it.
            </T>
          </View>
        )
      ) : attempts.loading ? (
        <Loader />
      ) : attempts.error ? (
        <ErrorBanner message={errorText(attempts.error)} />
      ) : !attempts.data?.length ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No fit checks yet"
            body="Program fit checks tell you how well a program suits you."
            action={<Button title="Browse fit checks" small onPress={() => navigation.navigate('Assess')} />}
          />
        </Card>
      ) : (
        <View style={{ gap: space.md }}>
          {attempts.data.map((a) => (
            <AttemptRow key={a.id} attempt={a} />
          ))}
        </View>
      )}
    </Screen>
  );
}
