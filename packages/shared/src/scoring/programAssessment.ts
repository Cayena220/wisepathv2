import type { AttemptAnswer, ProgramAssessment } from '../types';

export interface ProgramAssessmentScore {
  answers: AttemptAnswer[];
  earnedPoints: number;
  maxPoints: number;
  scorePercent: number;
  isFit: boolean;
  unanswered: string[];
}

/**
 * scorePercent = Σ chosen points ÷ Σ best points per question × 100 (rounded).
 * Answers are keyed by option id (v1 keyed them by index and always scored 0%).
 */
export const scoreProgramAssessment = (
  assessment: Pick<ProgramAssessment, 'questions' | 'passingPercent'>,
  answers: Record<string, string>,
): ProgramAssessmentScore => {
  let earnedPoints = 0;
  let maxPoints = 0;
  const unanswered: string[] = [];
  const rows: AttemptAnswer[] = [];

  for (const question of assessment.questions) {
    const best = Math.max(0, ...question.options.map((option) => option.points || 0));
    maxPoints += best;
    const chosen = question.options.find((option) => option.id === answers[question.id]);
    if (!chosen) {
      unanswered.push(question.id);
      continue;
    }
    earnedPoints += chosen.points || 0;
    rows.push({
      questionId: question.id,
      questionText: question.text,
      optionId: chosen.id,
      optionText: chosen.text,
      points: chosen.points || 0,
      maxPoints: best,
    });
  }

  const scorePercent = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
  return {
    answers: rows,
    earnedPoints,
    maxPoints,
    scorePercent,
    isFit: scorePercent >= assessment.passingPercent,
    unanswered,
  };
};
