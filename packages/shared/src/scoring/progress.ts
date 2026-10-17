import type { CurriculumTerm, SubjectState } from '../types';

export interface CurriculumProgress {
  totalSubjects: number;
  completedSubjects: number;
  ongoingSubjects: number;
  totalUnits: number;
  completedUnits: number;
  percent: number;
  graduationReady: boolean;
}

/** Units-based progress through a program's curriculum. */
export const computeCurriculumProgress = (
  curriculum: CurriculumTerm[],
  subjectStatus: Record<string, SubjectState>,
): CurriculumProgress => {
  let totalSubjects = 0;
  let completedSubjects = 0;
  let ongoingSubjects = 0;
  let totalUnits = 0;
  let completedUnits = 0;
  for (const term of curriculum) {
    for (const subject of term.subjects) {
      totalSubjects += 1;
      totalUnits += subject.units || 0;
      const state = subjectStatus[subject.id];
      if (state === 'completed') {
        completedSubjects += 1;
        completedUnits += subject.units || 0;
      } else if (state === 'ongoing') {
        ongoingSubjects += 1;
      }
    }
  }
  const percent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  return {
    totalSubjects,
    completedSubjects,
    ongoingSubjects,
    totalUnits,
    completedUnits,
    percent,
    graduationReady: totalSubjects > 0 && completedSubjects === totalSubjects,
  };
};

export interface ReadinessInput {
  profileComplete: boolean;
  hasCareerResult: boolean;
  hasActiveProgram: boolean;
  hasFitAttempt: boolean;
}

export interface ReadinessStep {
  id: keyof ReadinessInput;
  label: string;
  done: boolean;
}

/** Checklist for incoming students who have no curriculum progress yet. */
export const computeReadiness = (input: ReadinessInput): { steps: ReadinessStep[]; percent: number } => {
  const steps: ReadinessStep[] = [
    { id: 'profileComplete', label: 'Complete your profile', done: input.profileComplete },
    { id: 'hasCareerResult', label: 'Take the career assessment', done: input.hasCareerResult },
    { id: 'hasActiveProgram', label: 'Choose a program', done: input.hasActiveProgram },
    { id: 'hasFitAttempt', label: 'Check your program fit', done: input.hasFitAttempt },
  ];
  const percent = Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
  return { steps, percent };
};

export const termLabel = (year: number, semester: number): string =>
  `Year ${year} · ${semester === 3 ? 'Summer' : semester === 1 ? '1st Semester' : '2nd Semester'}`;
