import { ClipboardCheck } from 'lucide-react-native';
import { QuizRunner } from '../../components/QuizRunner';
import { EmptyState, Header, Screen } from '../../components/ui';
import { useCatalogView } from '../../hooks/useStudentData';
import { errorText } from '../../lib/hooks';
import type { AppScreen } from '../../navigation/types';
import { submitProgramAssessment } from '../../services';
import { useStudent } from '../../stores/session';

/** Program fit check — reachable from results, program pages and the Assess tab (v1 could not reach it). */
export function ProgramAssessmentScreen({ route, navigation }: AppScreen<'ProgramAssessment'>) {
  const { uid, account } = useStudent();
  const catalog = useCatalogView();
  const assessment = catalog.assessments.find((a) => a.id === route.params.assessmentId);
  const program = assessment ? catalog.programById.get(assessment.programId) : undefined;

  if (!assessment || !program)
    return (
      <Screen header={<Header title="Fit check" />}>
        <EmptyState icon={ClipboardCheck} title="This fit check isn’t available" body="It may have been archived by the department." />
      </Screen>
    );

  return (
    <QuizRunner
      title={program.code}
      submitLabel="See my score"
      questions={assessment.questions.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => ({ id: o.id, text: o.text })) }))}
      onSubmit={async (answers) => {
        if (!account) return;
        try {
          const attemptId = await submitProgramAssessment({ uid, account, assessment, program, answers });
          navigation.replace('AttemptResult', { attemptId, fresh: true });
        } catch (e) {
          throw new Error(errorText(e));
        }
      }}
    />
  );
}
