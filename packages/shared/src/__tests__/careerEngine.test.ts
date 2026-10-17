import { describe, expect, it } from 'vitest';
import {
  CAREER_INTEREST_OPTIONS,
  LEARNING_GOALS_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  PARENTAL_INCOME_OPTIONS,
  SHS_STRANDS,
  SKILL_LEVEL_OPTIONS,
} from '../constants/profileOptions';
import { rankPrograms, summarizeRanking, type ScoringProfile } from '../scoring/careerEngine';
import { deriveStrengths } from '../scoring/insights';
import { OPTION_IDS, SEED_CAREER_QUESTIONS, SEED_PROGRAMS } from '../seed';
import { legacyRank } from './legacyEngine';

/** Small deterministic PRNG so failures are reproducible. */
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sample = <T,>(rand: () => number, list: readonly T[], min: number, max: number): T[] => {
  const count = min + Math.floor(rand() * (max - min + 1));
  const pool = [...list];
  const out: T[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
};

describe('career engine parity with v1', () => {
  it('produces the same order and match % as the legacy engine for 500 random students', () => {
    const rand = mulberry32(2026);
    for (let run = 0; run < 500; run += 1) {
      const profile: ScoringProfile = {
        careerInterests: sample(rand, CAREER_INTEREST_OPTIONS, 1, 4),
        shsStrand: sample(rand, SHS_STRANDS, 1, 1)[0],
        learningGoals: sample(rand, LEARNING_GOALS_OPTIONS, 1, 3),
        currentSkills: sample(rand, SKILL_LEVEL_OPTIONS, 1, 1)[0],
        learningStyle: sample(rand, LEARNING_STYLE_OPTIONS, 1, 1)[0],
        parentalIncomeLevel: sample(rand, PARENTAL_INCOME_OPTIONS.map((o) => o.value), 1, 1)[0],
      };
      const indexAnswers: Record<string, string> = {};
      const optionAnswers: Record<string, string> = {};
      for (const question of SEED_CAREER_QUESTIONS) {
        const index = Math.floor(rand() * question.options.length);
        indexAnswers[question.id] = String(index);
        optionAnswers[question.id] = OPTION_IDS[index];
      }

      const legacy = legacyRank(indexAnswers, profile as never);
      const next = rankPrograms({
        programs: SEED_PROGRAMS,
        questions: SEED_CAREER_QUESTIONS,
        answers: optionAnswers,
        profile,
      }).rankings;

      expect(next.map((r) => r.programId)).toEqual(legacy.map((r) => r.programId));
      next.forEach((row, index) => {
        expect(Math.abs(row.matchPercent - legacy[index].matchPercent)).toBeLessThanOrEqual(1);
      });
    }
  });
});

describe('rankPrograms', () => {
  it('gives a tagged program the direct +3 and ignores that option’s dimension weights', () => {
    const questions = [
      {
        id: 'x1',
        options: [
          { id: 'a', text: 'A', dimensionWeights: { technology: 10 }, programId: 'tourism_management' },
          { id: 'b', text: 'B', dimensionWeights: { technology: 10 }, programId: null },
        ],
      },
    ];
    const tagged = rankPrograms({ programs: SEED_PROGRAMS, questions, answers: { x1: 'a' } });
    expect(tagged.dimensionScores.technology).toBe(0);
    expect(tagged.rankings[0].programId).toBe('tourism_management');
    expect(tagged.rankings[0].score).toBe(3);
  });

  it('summarizes top-3 programs and unique departments in order', () => {
    const { rankings } = rankPrograms({
      programs: SEED_PROGRAMS,
      questions: SEED_CAREER_QUESTIONS,
      answers: { q1: 'b', q2: 'b', q3: 'b', q4: 'b', q5: 'b', q6: 'a' },
      profile: { careerInterests: ['Information Technology & Computing'], shsStrand: 'STEM' },
    });
    const summary = summarizeRanking(rankings);
    expect(summary.topProgramIds).toEqual(['it', 'computer_science', 'mathematics']);
    expect(summary.topDepartmentIds).toEqual(['computing', 'arts_sciences']);
    expect(summary.bestDepartmentId).toBe('computing');
    const total = summary.top3.reduce((sum, row) => sum + row.matchPercent, 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });

  it('derives strengths for programs outside the three v1 cores', () => {
    const programsById = new Map(SEED_PROGRAMS.map((p) => [p.id, p]));
    const strengths = deriveStrengths(
      null,
      [{ programId: 'civil_engineering', programTitle: '', programCode: '', departmentId: '', score: 1, matchPercent: 1 }],
      programsById,
    );
    expect(strengths).toContain('Logical problem-solving and technical curiosity');
  });
});
