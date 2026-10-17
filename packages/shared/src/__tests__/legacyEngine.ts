/**
 * Store-free copy of the v1 engine (services/quizService.ts), used only by the parity test.
 * Answers are option indexes as strings, exactly like v1 stored them.
 */
import {
  LEGACY_ASSESSMENT_AFFINITY,
  LEGACY_CAREER_INTEREST_WEIGHTS,
  LEGACY_COURSES,
  LEGACY_LEARNING_GOAL_WEIGHTS,
  LEGACY_PROGRAM_IDS,
  LEGACY_QUIZ_QUESTIONS,
  LEGACY_SHS_STRAND_WEIGHTS,
} from '../seed/legacyCatalog';

type Weights = Partial<Record<string, number>>;

export interface LegacyProfile {
  careerInterests?: string[];
  shsStrand?: string;
  learningGoals?: string[];
  currentSkills?: string;
  learningStyle?: string;
  parentalIncomeLevel?: string;
}

const emptyScores = (): Record<string, number> => Object.fromEntries(LEGACY_PROGRAM_IDS.map((id) => [id, 0]));

const addWeights = (scores: Record<string, number>, weights?: Weights) => {
  if (!weights) return;
  Object.entries(weights).forEach(([id, points]) => {
    scores[id] = (scores[id] || 0) + (points || 0);
  });
};

const calculateProfileScores = (profile?: LegacyProfile | null) => {
  const scores = emptyScores();
  if (!profile) return scores;
  (profile.careerInterests || []).forEach((interest) => addWeights(scores, LEGACY_CAREER_INTEREST_WEIGHTS[interest]));
  const strand = profile.shsStrand;
  if (strand) {
    addWeights(scores, LEGACY_SHS_STRAND_WEIGHTS[strand]);
    if (!LEGACY_SHS_STRAND_WEIGHTS[strand] && strand.startsWith('TVL')) addWeights(scores, LEGACY_SHS_STRAND_WEIGHTS.TVL);
  }
  (profile.learningGoals || []).forEach((goal) => addWeights(scores, LEGACY_LEARNING_GOAL_WEIGHTS[goal]));
  if (profile.currentSkills === 'Advanced') addWeights(scores, { it: 1, hospitality: 1, criminal_justice: 1 });
  if (profile.learningStyle === 'Hands-on') addWeights(scores, { hospitality: 1, it: 1 });
  if (profile.learningStyle === 'Reading') addWeights(scores, { criminal_justice: 1, it: 1 });
  return scores;
};

const calculateCourseScores = (answers: Record<string, string>) => {
  const scores = emptyScores();
  const byId = Object.fromEntries(LEGACY_QUIZ_QUESTIONS.map((q) => [q.id, q]));
  Object.entries(answers).forEach(([questionId, answerIndex]) => {
    const idx = parseInt(answerIndex, 10);
    addWeights(scores, byId[questionId]?.scoringWeights[idx]);
  });
  return scores;
};

const affordability = (profile: LegacyProfile | null | undefined, tuition?: string) => {
  const income = profile?.parentalIncomeLevel;
  if (!income || income === 'prefer_not_to_say' || !tuition) return 0;
  const lower = tuition.startsWith('₱25,000');
  const higher = tuition.startsWith('₱30,000');
  if (income === 'below_10k') return lower ? 2.5 : higher ? 1 : 0;
  if (income === '10k_20k') return lower ? 2 : higher ? 0.75 : 0;
  if (income === '20k_40k') return lower ? 1 : higher ? 0.5 : 0;
  return 0;
};

export const legacyRank = (answers: Record<string, string>, profile?: LegacyProfile | null) => {
  const quiz = calculateCourseScores(answers);
  const profileScores = calculateProfileScores(profile);
  const combined: Record<string, number> = {};
  LEGACY_PROGRAM_IDS.forEach((id) => {
    const affinity = LEGACY_ASSESSMENT_AFFINITY[id] || {};
    const assessment = Object.entries(affinity).reduce((t, [d, m]) => t + (quiz[d] || 0) * (m || 0), 0);
    const course = LEGACY_COURSES.find((c) => c.id === id);
    combined[id] = assessment + 0 + (profileScores[id] || 0) * 0.85 + affordability(profile, course?.estimatedTuitionPerTerm);
  });
  const sorted = Object.values(combined).sort((a, b) => b - a);
  const top = sorted.slice(0, 3).reduce((s, v) => s + v, 0) || 1;
  return LEGACY_PROGRAM_IDS.map((id) => ({
    programId: id as string,
    score: combined[id],
    matchPercent: Math.max(0, Math.round((combined[id] / top) * 100)),
  })).sort((a, b) => b.score - a.score);
};
