import {
  DIRECT_TAG_POINTS,
  GAS_ALL_PROGRAMS_BONUS,
  PROFILE_WEIGHT,
} from '../constants/collections';
import { DIMENSIONS, emptyDimensionScores, type DimensionId } from '../constants/dimensions';
import { SHS_STRANDS } from '../constants/profileOptions';
import type { CareerQuestion, Program, RankedProgram } from '../types';

/** What the engine needs from a program. A full Program doc satisfies it. */
export type ScoringProgram = Pick<
  Program,
  | 'id'
  | 'title'
  | 'code'
  | 'departmentId'
  | 'dimensionAffinity'
  | 'matchSignals'
  | 'tuitionPerTerm'
  | 'catalogOrder'
>;

export type ScoringQuestion = Pick<CareerQuestion, 'id' | 'options'>;

export interface ScoringProfile {
  careerInterests?: string[] | string;
  shsStrand?: string;
  learningGoals?: string[] | string;
  currentSkills?: string;
  learningStyle?: string;
  parentalIncomeLevel?: string;
}

/** questionId → optionId */
export type AnswerMap = Record<string, string>;

const asList = (value: string[] | string | undefined): string[] =>
  Array.isArray(value) ? value : value ? [String(value)] : [];

const KNOWN_STRANDS = new Set<string>(SHS_STRANDS);

/** "TVL – ICT" and other TVL sub-strands fall back to the TVL weights, as in v1. */
export const normalizeStrand = (strand: string | undefined): string | undefined => {
  if (!strand) return undefined;
  if (KNOWN_STRANDS.has(strand)) return strand;
  return strand.startsWith('TVL') ? 'TVL' : strand;
};

export const computeDimensionScores = (
  questions: ScoringQuestion[],
  answers: AnswerMap,
): Record<DimensionId, number> => {
  const scores = emptyDimensionScores();
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const [questionId, optionId] of Object.entries(answers)) {
    const option = byId.get(questionId)?.options.find((o) => o.id === optionId);
    if (!option || option.programId) continue;
    for (const [dimension, points] of Object.entries(option.dimensionWeights ?? {})) {
      if (dimension in scores) scores[dimension as DimensionId] += points || 0;
    }
  }
  return scores;
};

export const computeDirectProgramScores = (
  questions: ScoringQuestion[],
  answers: AnswerMap,
): Record<string, number> => {
  const scores: Record<string, number> = {};
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const [questionId, optionId] of Object.entries(answers)) {
    const programId = byId.get(questionId)?.options.find((o) => o.id === optionId)?.programId;
    if (programId) scores[programId] = (scores[programId] || 0) + DIRECT_TAG_POINTS;
  }
  return scores;
};

/** Profile signals for one program, before PROFILE_WEIGHT is applied. Order of additions matches v1. */
export const computeProfileScore = (program: ScoringProgram, profile?: ScoringProfile | null): number => {
  if (!profile) return 0;
  const signals = program.matchSignals;
  let score = 0;
  for (const interest of asList(profile.careerInterests)) score += signals?.careerInterests?.[interest] || 0;

  const strand = normalizeStrand(profile.shsStrand);
  if (strand === 'GAS') score += GAS_ALL_PROGRAMS_BONUS;
  else if (strand) score += signals?.shsStrands?.[strand] || 0;

  for (const goal of asList(profile.learningGoals)) score += signals?.learningGoals?.[goal] || 0;
  if (profile.currentSkills) score += signals?.skillLevels?.[profile.currentSkills] || 0;
  if (profile.learningStyle) score += signals?.learningStyles?.[profile.learningStyle] || 0;
  return score;
};

export const affordabilityConsidered = (profile?: ScoringProfile | null): boolean =>
  Boolean(profile?.parentalIncomeLevel) && profile?.parentalIncomeLevel !== 'prefer_not_to_say';

/**
 * Bonus for programs whose tuition fits the family income band.
 * "Lower cost" = minimum tuition per term up to ₱25,000; "higher cost" = up to ₱30,000.
 */
export const computeAffordabilityScore = (program: ScoringProgram, profile?: ScoringProfile | null): number => {
  const income = profile?.parentalIncomeLevel;
  const min = program.tuitionPerTerm?.min;
  if (!affordabilityConsidered(profile) || min == null || !Number.isFinite(min)) return 0;
  const lower = min <= 25_000;
  const higher = !lower && min <= 30_000;
  if (income === 'below_10k') return lower ? 2.5 : higher ? 1 : 0;
  if (income === '10k_20k') return lower ? 2 : higher ? 0.75 : 0;
  if (income === '20k_40k') return lower ? 1 : higher ? 0.5 : 0;
  return 0;
};

export interface RankInput {
  programs: ScoringProgram[];
  questions: ScoringQuestion[];
  answers: AnswerMap;
  profile?: ScoringProfile | null;
}

export interface RankOutput {
  rankings: RankedProgram[];
  dimensionScores: Record<DimensionId, number>;
  affordabilityConsidered: boolean;
}

/**
 * score = Σ dimensionScore × affinity + direct tags + profile × 0.85 + affordability
 * matchPercent = score ÷ (sum of the top-3 scores) × 100, so the top three add up to about 100.
 */
export const rankPrograms = ({ programs, questions, answers, profile }: RankInput): RankOutput => {
  const dimensionScores = computeDimensionScores(questions, answers);
  const direct = computeDirectProgramScores(questions, answers);

  const scored = programs.map((program) => {
    const assessment = Object.entries(program.dimensionAffinity ?? {}).reduce(
      (total, [dimension, multiplier]) =>
        total + (dimensionScores[dimension as DimensionId] || 0) * (multiplier || 0),
      0,
    );
    const score =
      assessment +
      (direct[program.id] || 0) +
      computeProfileScore(program, profile) * PROFILE_WEIGHT +
      computeAffordabilityScore(program, profile);
    return { program, score };
  });

  scored.sort((a, b) => b.score - a.score || a.program.catalogOrder - b.program.catalogOrder);
  const topThreeTotal = scored.slice(0, 3).reduce((sum, row) => sum + row.score, 0) || 1;

  const rankings: RankedProgram[] = scored.map(({ program, score }) => ({
    programId: program.id,
    programTitle: program.title,
    programCode: program.code,
    departmentId: program.departmentId,
    score: Math.round(score * 1000) / 1000,
    matchPercent: Math.max(0, Math.round((score / topThreeTotal) * 100)),
  }));

  return { rankings, dimensionScores, affordabilityConsidered: affordabilityConsidered(profile) };
};

export interface RankingSummary {
  top3: RankedProgram[];
  topProgramIds: string[];
  topDepartmentIds: string[];
  bestProgramId: string;
  bestDepartmentId: string;
  bestMatchPercent: number;
}

export const summarizeRanking = (rankings: RankedProgram[]): RankingSummary => {
  const top3 = rankings.slice(0, 3);
  const topDepartmentIds: string[] = [];
  for (const row of top3) if (!topDepartmentIds.includes(row.departmentId)) topDepartmentIds.push(row.departmentId);
  return {
    top3,
    topProgramIds: top3.map((row) => row.programId),
    topDepartmentIds,
    bestProgramId: top3[0]?.programId ?? '',
    bestDepartmentId: top3[0]?.departmentId ?? '',
    bestMatchPercent: top3[0]?.matchPercent ?? 0,
  };
};

/** The dimension a program leans on most, or null when it has no affinity at all. */
export const dominantDimension = (program: Pick<Program, 'dimensionAffinity'>): DimensionId | null => {
  let best: DimensionId | null = null;
  let bestValue = 0;
  for (const dimension of DIMENSIONS) {
    const value = program.dimensionAffinity?.[dimension] ?? 0;
    if (value > bestValue) {
      best = dimension;
      bestValue = value;
    }
  }
  return best;
};
