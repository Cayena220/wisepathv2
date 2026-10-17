/**
 * Analytics for the admin website, computed from a sample of results and fit-check attempts.
 * Pure functions (no Firebase), so they are unit-tested and cost no extra reads.
 */
import { DIMENSION_LABELS, DIMENSIONS, type DimensionId } from '../constants/dimensions';
import {
  CAREER_INTEREST_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  SHS_STRANDS,
  SKILL_LEVEL_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from '../constants/profileOptions';
import type { CareerResult, ProgramAssessment, ProgramAssessmentAttempt } from '../types';

/** One bar / slice. `ids` are the result (or attempt) ids behind it, for drill-down. */
export interface Segment {
  key: string;
  label: string;
  count: number;
  /** count ÷ total (0–1) */
  share: number;
  ids: string[];
}

const NOT_SET = '__not_set__';

const share = (count: number, total: number) => (total > 0 ? count / total : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Groups items into segments, keeping a fixed order for known keys, then extras by count. */
function group<T extends { id: string }>(
  items: T[],
  keysOf: (item: T) => string[],
  order: readonly string[],
  labels: Record<string, string> = {},
  total = items.length,
): Segment[] {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const keys = keysOf(item);
    for (const key of keys.length ? keys : [NOT_SET]) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item.id);
    }
  }
  const known = order.filter((k) => map.has(k));
  const extras = [...map.keys()].filter((k) => !order.includes(k) && k !== NOT_SET).sort((a, b) => map.get(b)!.length - map.get(a)!.length);
  const keys = [...known, ...extras, ...(map.has(NOT_SET) ? [NOT_SET] : [])];
  return keys.map((key) => {
    const ids = map.get(key)!;
    return { key, label: key === NOT_SET ? 'Not set' : labels[key] ?? key, count: ids.length, share: share(ids.length, total), ids };
  });
}

const one = (value: string | undefined | null) => (value ? [value] : []);

// ---------------------------------------------------------------- match strength (ordinal bands)

/**
 * The top match's share of the top-3 total. ~33% means the top three are tied;
 * the higher it is, the more clearly one program stands out.
 */
export const MATCH_BANDS = [
  { key: 'tied', label: 'Under 40%', hint: 'Top 3 nearly tied', min: 0, max: 40 },
  { key: '40', label: '40–49%', hint: 'Slight favorite', min: 40, max: 50 },
  { key: '50', label: '50–59%', hint: 'Clear favorite', min: 50, max: 60 },
  { key: '60', label: '60% and up', hint: 'Strong favorite', min: 60, max: 101 },
] as const;

export const SCORE_BANDS = [
  { key: 'low', label: 'Under 50%', min: 0, max: 50 },
  { key: 'mid', label: '50–74%', min: 50, max: 75 },
  { key: 'pass', label: '75–89%', min: 75, max: 90 },
  { key: 'top', label: '90–100%', min: 90, max: 101 },
] as const;

const band = <B extends { key: string; label: string; min: number; max: number }>(
  bands: readonly B[],
  items: { id: string; value: number }[],
): Segment[] =>
  bands.map((b) => {
    const ids = items.filter((i) => i.value >= b.min && i.value < b.max).map((i) => i.id);
    return { key: b.key, label: b.label, count: ids.length, share: share(ids.length, items.length), ids };
  });

// ---------------------------------------------------------------- career results

export interface ProgramStat {
  programId: string;
  programTitle: string;
  programCode: string;
  departmentId: string;
  /** students whose latest top 3 includes the program */
  top3Count: number;
  /** students whose latest top match is the program */
  bestCount: number;
  /** average match % when the program is in the top 3 */
  avgMatch: number;
  bestIds: string[];
  top3Ids: string[];
}

export interface DepartmentStat {
  departmentId: string;
  top3Count: number;
  bestCount: number;
  avgBestMatch: number;
  bestIds: string[];
}

export interface ResultAnalytics {
  total: number;
  bestHere: number;
  bestHereIds: string[];
  avgBestMatch: number;
  affordabilityShare: number;
  strands: Segment[];
  interests: Segment[];
  studentStatus: Segment[];
  residence: Segment[];
  learningStyle: Segment[];
  skillLevel: Segment[];
  matchStrength: Segment[];
  dimensions: { id: DimensionId; label: string; average: number }[];
  programs: ProgramStat[];
  departments: DepartmentStat[];
}

/**
 * @param results latest result per student (isLatest), already scoped by the caller
 * @param departmentId when set, "best here" and the program table refer to this department
 */
export function computeResultAnalytics(results: CareerResult[], departmentId: string | null = null): ResultAnalytics {
  const total = results.length;
  const snap = (r: CareerResult) => r.studentSnapshot ?? ({} as CareerResult['studentSnapshot']);

  const bestHereIds = departmentId ? results.filter((r) => r.bestDepartmentId === departmentId).map((r) => r.id) : results.map((r) => r.id);

  const dimensions = DIMENSIONS.map((id) => ({
    id,
    label: DIMENSION_LABELS[id],
    average: total ? round1(results.reduce((sum, r) => sum + (r.dimensionScores?.[id] ?? 0), 0) / total) : 0,
  }));

  // programs (top-3 appearances)
  const programMap = new Map<string, ProgramStat & { matchSum: number }>();
  for (const r of results) {
    (r.top3 ?? []).forEach((row, index) => {
      if (departmentId && row.departmentId !== departmentId) return;
      if (!programMap.has(row.programId)) {
        programMap.set(row.programId, {
          programId: row.programId,
          programTitle: row.programTitle,
          programCode: row.programCode,
          departmentId: row.departmentId,
          top3Count: 0,
          bestCount: 0,
          avgMatch: 0,
          bestIds: [],
          top3Ids: [],
          matchSum: 0,
        });
      }
      const stat = programMap.get(row.programId)!;
      stat.top3Count += 1;
      stat.top3Ids.push(r.id);
      stat.matchSum += row.matchPercent;
      if (index === 0) {
        stat.bestCount += 1;
        stat.bestIds.push(r.id);
      }
    });
  }
  const programs = [...programMap.values()]
    .map(({ matchSum, ...stat }) => ({ ...stat, avgMatch: stat.top3Count ? Math.round(matchSum / stat.top3Count) : 0 }))
    .sort((a, b) => b.bestCount - a.bestCount || b.top3Count - a.top3Count);

  // departments (only meaningful across departments)
  const deptMap = new Map<string, DepartmentStat & { matchSum: number }>();
  for (const r of results) {
    for (const d of r.topDepartmentIds ?? []) {
      if (!deptMap.has(d)) deptMap.set(d, { departmentId: d, top3Count: 0, bestCount: 0, avgBestMatch: 0, bestIds: [], matchSum: 0 });
      deptMap.get(d)!.top3Count += 1;
    }
    if (r.bestDepartmentId) {
      if (!deptMap.has(r.bestDepartmentId)) {
        deptMap.set(r.bestDepartmentId, { departmentId: r.bestDepartmentId, top3Count: 0, bestCount: 0, avgBestMatch: 0, bestIds: [], matchSum: 0 });
      }
      const stat = deptMap.get(r.bestDepartmentId)!;
      stat.bestCount += 1;
      stat.bestIds.push(r.id);
      stat.matchSum += r.bestMatchPercent ?? 0;
    }
  }
  const departments = [...deptMap.values()]
    .map(({ matchSum, ...stat }) => ({ ...stat, avgBestMatch: stat.bestCount ? Math.round(matchSum / stat.bestCount) : 0 }))
    .sort((a, b) => b.bestCount - a.bestCount);

  const labelsOf = (options: readonly { value: string; label: string }[]) => Object.fromEntries(options.map((o) => [o.value, o.label]));

  return {
    total,
    bestHere: bestHereIds.length,
    bestHereIds,
    avgBestMatch: total ? Math.round(results.reduce((sum, r) => sum + (r.bestMatchPercent ?? 0), 0) / total) : 0,
    affordabilityShare: share(results.filter((r) => snap(r).affordabilityConsidered).length, total),
    strands: group(results, (r) => one(snap(r).shsStrand), SHS_STRANDS),
    interests: group(results, (r) => snap(r).careerInterests ?? [], CAREER_INTEREST_OPTIONS)
      .filter((s) => s.key !== NOT_SET)
      .sort((a, b) => b.count - a.count),
    studentStatus: group(results, (r) => one(snap(r).studentStatus), STUDENT_STATUS_OPTIONS.map((o) => o.value), labelsOf(STUDENT_STATUS_OPTIONS)),
    residence: group(results, (r) => one(snap(r).residenceType), RESIDENCE_TYPE_OPTIONS.map((o) => o.value), labelsOf(RESIDENCE_TYPE_OPTIONS)),
    learningStyle: group(results, (r) => one(snap(r).learningStyle), LEARNING_STYLE_OPTIONS),
    skillLevel: group(results, (r) => one(snap(r).currentSkills), SKILL_LEVEL_OPTIONS),
    matchStrength: band(MATCH_BANDS, results.map((r) => ({ id: r.id, value: r.bestMatchPercent ?? 0 }))),
    dimensions,
    programs,
    departments,
  };
}

// ---------------------------------------------------------------- program fit checks

export interface AssessmentStat {
  assessmentId: string;
  assessmentTitle: string;
  programId: string;
  programTitle: string;
  departmentId: string;
  attempts: number;
  fit: number;
  fitRate: number;
  avgScore: number;
  ids: string[];
  fitIds: string[];
}

export interface AttemptAnalytics {
  total: number;
  students: number;
  fit: number;
  fitRate: number;
  fitStudents: number;
  avgScore: number;
  scoreBands: Segment[];
  byAssessment: AssessmentStat[];
  /** attempts per program id */
  byProgram: Map<string, { attempts: number; fit: number }>;
}

export function computeAttemptAnalytics(attempts: ProgramAssessmentAttempt[]): AttemptAnalytics {
  const total = attempts.length;
  const fitAttempts = attempts.filter((a) => a.isFit);
  const byAssessmentMap = new Map<string, AssessmentStat & { scoreSum: number }>();
  const byProgram = new Map<string, { attempts: number; fit: number }>();
  for (const a of attempts) {
    if (!byAssessmentMap.has(a.assessmentId)) {
      byAssessmentMap.set(a.assessmentId, {
        assessmentId: a.assessmentId,
        assessmentTitle: a.assessmentTitle,
        programId: a.programId,
        programTitle: a.programTitle,
        departmentId: a.departmentId,
        attempts: 0,
        fit: 0,
        fitRate: 0,
        avgScore: 0,
        ids: [],
        fitIds: [],
        scoreSum: 0,
      });
    }
    const stat = byAssessmentMap.get(a.assessmentId)!;
    stat.attempts += 1;
    stat.ids.push(a.id);
    stat.scoreSum += a.scorePercent;
    if (a.isFit) {
      stat.fit += 1;
      stat.fitIds.push(a.id);
    }
    const p = byProgram.get(a.programId) ?? { attempts: 0, fit: 0 };
    p.attempts += 1;
    if (a.isFit) p.fit += 1;
    byProgram.set(a.programId, p);
  }
  const byAssessment = [...byAssessmentMap.values()]
    .map(({ scoreSum, ...s }) => ({ ...s, fitRate: share(s.fit, s.attempts), avgScore: s.attempts ? Math.round(scoreSum / s.attempts) : 0 }))
    .sort((a, b) => b.attempts - a.attempts);

  return {
    total,
    students: new Set(attempts.map((a) => a.userId)).size,
    fit: fitAttempts.length,
    fitRate: share(fitAttempts.length, total),
    fitStudents: new Set(fitAttempts.map((a) => a.userId)).size,
    avgScore: total ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercent, 0) / total) : 0,
    scoreBands: band(SCORE_BANDS, attempts.map((a) => ({ id: a.id, value: a.scorePercent }))),
    byAssessment,
    byProgram,
  };
}

// ---------------------------------------------------------------- per-question analysis

export interface QuestionStat {
  questionId: string;
  text: string;
  responses: number;
  /** share of responses that picked the best-scoring answer (0–1) */
  bestShare: number;
  /** average points ÷ best points (0–1) */
  avgScoreShare: number;
  options: { optionId: string; text: string; points: number; count: number; share: number; isBest: boolean }[];
}

/** How students answered each question of one program assessment (current version's questions). */
export function computeQuestionAnalytics(assessment: Pick<ProgramAssessment, 'questions'>, attempts: ProgramAssessmentAttempt[]): QuestionStat[] {
  return assessment.questions.map((q) => {
    const best = Math.max(0, ...q.options.map((o) => o.points));
    const answers = attempts.flatMap((a) => a.answers.filter((ans) => ans.questionId === q.id));
    const responses = answers.length;
    const counts = new Map<string, number>();
    for (const ans of answers) counts.set(ans.optionId, (counts.get(ans.optionId) ?? 0) + 1);
    const pointsSum = answers.reduce((sum, ans) => sum + (q.options.find((o) => o.id === ans.optionId)?.points ?? ans.points ?? 0), 0);
    return {
      questionId: q.id,
      text: q.text,
      responses,
      bestShare: share(answers.filter((ans) => (q.options.find((o) => o.id === ans.optionId)?.points ?? 0) >= best && best > 0).length, responses),
      avgScoreShare: best > 0 && responses ? pointsSum / (best * responses) : 0,
      options: q.options.map((o) => ({
        optionId: o.id,
        text: o.text,
        points: o.points,
        count: counts.get(o.id) ?? 0,
        share: share(counts.get(o.id) ?? 0, responses),
        isBest: o.points >= best && best > 0,
      })),
    };
  });
}

// ---------------------------------------------------------------- helpers

/** Monday-start weekly buckets ending now: [{ start, end, label }] (oldest first). */
export function lastWeeks(count: number, now = Date.now()) {
  const WEEK = 7 * 86_400_000;
  return Array.from({ length: count }, (_, i) => {
    const end = now - (count - 1 - i) * WEEK;
    const start = end - WEEK;
    return { start, end, label: new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });
}

export const percentText = (fraction: number) => `${Math.round(fraction * 100)}%`;
