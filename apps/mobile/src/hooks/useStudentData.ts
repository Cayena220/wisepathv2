import type { CareerResult, ProgramAssessmentAttempt } from '@wisepath/shared';
import { doc } from 'firebase/firestore';
import * as React from 'react';
import { db } from '../lib/firebase';
import { useLiveDoc, useLiveQuery } from '../lib/hooks';
import { myAttemptsQuery, myResultsQuery } from '../services';
import { activeDepartments, matchablePrograms, orderedQuestions, useCatalog } from '../stores/catalog';
import { useStudent } from '../stores/session';

export function useMyResults() {
  const { uid } = useStudent();
  return useLiveQuery<CareerResult>(uid ? myResultsQuery(uid) : null, `results:${uid}`);
}

export function useMyAttempts() {
  const { uid } = useStudent();
  return useLiveQuery<ProgramAssessmentAttempt>(uid ? myAttemptsQuery(uid) : null, `attempts:${uid}`);
}

export function useLatestResult() {
  const { account } = useStudent();
  const id = account?.latestResult?.resultId;
  return useLiveDoc<CareerResult>(id ? doc(db, 'careerResults', id) : null, `result:${id}`);
}

/** Catalog slices computed once per change (zustand selectors must not build new arrays). */
export function useCatalogView() {
  const state = useCatalog();
  const { load, status } = state;
  React.useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);
  return React.useMemo(() => {
    const departments = activeDepartments(state);
    const programs = matchablePrograms(state);
    return {
      status: state.status,
      error: state.error,
      reload: () => state.load(true),
      departments,
      deptById: new Map(state.departments.map((d) => [d.id, d])),
      programs,
      programById: new Map(state.programs.map((p) => [p.id, p])),
      questions: orderedQuestions(state),
      assessments: state.assessments,
      assessmentsFor: (programId: string) => state.assessments.filter((a) => a.programId === programId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.version, state.programs, state.departments, state.questions, state.assessments, state.error]);
}

/** Latest attempt per assessment id. */
export function latestAttemptByAssessment(attempts: ProgramAssessmentAttempt[] | undefined) {
  const map = new Map<string, ProgramAssessmentAttempt>();
  for (const a of attempts ?? []) if (!map.has(a.assessmentId)) map.set(a.assessmentId, a);
  return map;
}
