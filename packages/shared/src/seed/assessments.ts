import { LEGACY_DIMENSION_MAP, type DimensionWeights } from '../constants/dimensions';
import { LIMITS } from '../constants/collections';
import type { CareerQuestion, ProgramAssessment, Stamps } from '../types';
import { PROGRAM_DEPARTMENT_MAP } from './departments';
import { LEGACY_PROGRAM_ASSESSMENTS, LEGACY_QUIZ_QUESTIONS } from './legacyCatalog';

export type SeedCareerQuestion = Omit<CareerQuestion, keyof Stamps>;
export type SeedProgramAssessment = Omit<ProgramAssessment, keyof Stamps>;

export const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

const renameDimensions = (weights: Partial<Record<string, number>>): DimensionWeights => {
  const out: DimensionWeights = {};
  for (const [legacy, value] of Object.entries(weights)) {
    const dimension = LEGACY_DIMENSION_MAP[legacy];
    if (dimension && value) out[dimension] = value;
  }
  return out;
};

/** The six v1 career questions, owned by the Super Admin ("system" scope). */
export const SEED_CAREER_QUESTIONS: SeedCareerQuestion[] = LEGACY_QUIZ_QUESTIONS.map((question, index) => ({
  id: question.id,
  text: question.text,
  order: index + 1,
  scope: 'system',
  departmentId: null,
  status: 'active',
  options: question.options.map((text, optionIndex) => ({
    id: OPTION_IDS[optionIndex],
    text,
    dimensionWeights: renameDimensions(question.scoringWeights[optionIndex] ?? {}),
    programId: null,
  })),
}));

/** The three v1 program assessments, now with option points instead of weight maps. */
export const SEED_PROGRAM_ASSESSMENTS: SeedProgramAssessment[] = LEGACY_PROGRAM_ASSESSMENTS.map((assessment) => ({
  id: assessment.id,
  programId: assessment.courseId,
  departmentId: PROGRAM_DEPARTMENT_MAP[assessment.courseId],
  title: assessment.title,
  description: assessment.description,
  passingPercent: LIMITS.defaultPassingPercent,
  version: 1,
  status: 'active',
  questions: assessment.questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: question.options.map((text, optionIndex) => ({
      id: OPTION_IDS[optionIndex],
      text,
      points: question.scoringWeights[optionIndex]?.[assessment.courseId] ?? 0,
    })),
  })),
}));
