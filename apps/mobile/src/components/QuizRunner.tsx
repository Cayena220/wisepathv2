import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, BackHandler, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { colors, radius, space } from '../theme';
import { Button, ErrorBanner, ProgressBar, Screen, T, Tap } from './ui';

export interface QuizQuestion {
  id: string;
  text: string;
  eyebrow?: string;
  options: { id: string; text: string }[];
}

/** One question per screen. Answers live only in this component, so every start is fresh. */
export function QuizRunner({
  title,
  questions,
  submitLabel,
  onSubmit,
}: {
  title: string;
  questions: QuizQuestion[];
  submitLabel: string;
  onSubmit: (answers: Record<string, string>) => Promise<void>;
}) {
  const navigation = useNavigation();
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const question = questions[index];
  const last = index === questions.length - 1;
  const answered = Object.keys(answers).length;

  const exit = React.useCallback(() => {
    if (!answered) return navigation.goBack();
    Alert.alert('Leave the assessment?', 'Your answers so far will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [answered, navigation]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) setIndex((i) => i - 1);
      else exit();
      return true;
    });
    return () => sub.remove();
  }, [index, exit]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(answers);
    } catch (e) {
      setError((e as Error).message || 'Could not save your answers.');
      setBusy(false);
    }
  };

  if (!question) return null;

  return (
    <Screen
      header={
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tap onPress={exit} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: colors.line }} accessibilityLabel="Leave">
              <X size={20} color={colors.navy900} />
            </Tap>
            <T variant="bodySm" weight="semibold" color={colors.textMuted}>
              {title}
            </T>
            <T variant="bodySm" weight="bold">
              {index + 1}/{questions.length}
            </T>
          </View>
          <ProgressBar value={((index + (answers[question.id] ? 1 : 0)) / questions.length) * 100} color={colors.gold500} height={6} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {index > 0 && <Button title="Back" icon={ArrowLeft} variant="outline" onPress={() => setIndex(index - 1)} style={{ flex: 1 }} />}
          {last ? (
            <Button
              title={submitLabel}
              icon={Check}
              variant="gold"
              onPress={() => void submit()}
              loading={busy}
              disabled={answered < questions.length}
              style={{ flex: 2 }}
            />
          ) : (
            <Button title="Next" iconRight={ArrowRight} onPress={() => setIndex(index + 1)} disabled={!answers[question.id]} style={{ flex: 2 }} />
          )}
        </View>
      }
    >
      <Animated.View key={question.id} entering={FadeInRight.duration(220)} style={{ gap: space.lg }}>
        {question.eyebrow && (
          <T variant="label" color={colors.gold700}>
            {question.eyebrow}
          </T>
        )}
        <T variant="h1">{question.text}</T>
        <View style={{ gap: 10, marginTop: space.sm }}>
          {question.options.map((option, i) => {
            const selected = answers[question.id] === option.id;
            return (
              <Tap
                key={option.id}
                onPress={() => {
                  setAnswers((a) => ({ ...a, [question.id]: option.id }));
                  if (!last) setTimeout(() => setIndex((n) => Math.min(n + 1, questions.length - 1)), 220);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: space.lg,
                  borderRadius: radius.lg,
                  backgroundColor: selected ? colors.navy900 : colors.white,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.navy900 : colors.line,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.gold500 : colors.surface,
                  }}
                >
                  <T variant="bodySm" weight="bold" color={selected ? colors.white : colors.navy700}>
                    {String.fromCharCode(65 + i)}
                  </T>
                </View>
                <T variant="body" weight={selected ? 'semibold' : 'medium'} color={selected ? colors.white : colors.navy900} style={{ flex: 1 }}>
                  {option.text}
                </T>
              </Tap>
            );
          })}
        </View>
        {error && <ErrorBanner message={error} />}
        {last && answered < questions.length && (
          <T variant="caption" color={colors.textMuted} center>
            Answer every question to continue ({answered}/{questions.length}).
          </T>
        )}
      </Animated.View>
    </Screen>
  );
}
