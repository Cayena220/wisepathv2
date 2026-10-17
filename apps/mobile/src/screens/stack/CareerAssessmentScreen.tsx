import { Compass } from 'lucide-react-native';
import { QuizRunner } from '../../components/QuizRunner';
import { Button, EmptyState, Header, Loader, Screen } from '../../components/ui';
import { useCatalogView } from '../../hooks/useStudentData';
import { errorText } from '../../lib/hooks';
import type { AppScreen } from '../../navigation/types';
import { submitCareerAssessment } from '../../services';
import { useStudent } from '../../stores/session';

export function CareerAssessmentScreen({ navigation }: AppScreen<'CareerAssessment'>) {
  const { uid, account } = useStudent();
  const catalog = useCatalogView();

  if (catalog.status === 'loading' && !catalog.questions.length) return <Loader label="Loading questions…" />;
  if (!catalog.questions.length || !catalog.programs.length)
    return (
      <Screen header={<Header title="Career assessment" />}>
        <EmptyState
          icon={Compass}
          title="The assessment isn’t available yet"
          body={catalog.error ?? 'Please check your connection and try again.'}
          action={<Button title="Retry" small onPress={() => void catalog.reload()} />}
        />
      </Screen>
    );

  return (
    <QuizRunner
      title="Career assessment"
      submitLabel="See my top 3"
      questions={catalog.questions.map((q) => ({
        id: q.id,
        text: q.text,
        eyebrow: q.scope === 'department' ? catalog.deptById.get(q.departmentId ?? '')?.code : undefined,
        options: q.options,
      }))}
      onSubmit={async (answers) => {
        if (!account) return;
        try {
          const resultId = await submitCareerAssessment({ uid, account, programs: catalog.programs, questions: catalog.questions, answers });
          navigation.replace('ResultDetail', { resultId, fresh: true });
        } catch (e) {
          throw new Error(errorText(e));
        }
      }}
    />
  );
}
