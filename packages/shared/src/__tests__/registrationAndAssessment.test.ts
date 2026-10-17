import { describe, expect, it } from 'vitest';
import {
  computeRegistrationStatus,
  formatManila,
  manilaLocalToMillis,
  millisToManilaLocal,
} from '../registration/status';
import { scoreProgramAssessment } from '../scoring/programAssessment';
import { computeCurriculumProgress } from '../scoring/progress';
import { SEED_PROGRAM_ASSESSMENTS, SEED_PROGRAMS } from '../seed';

describe('computeRegistrationStatus', () => {
  const t = 1_800_000_000_000;
  it('is closed when disabled, regardless of dates', () => {
    expect(computeRegistrationStatus({ enabled: false, opensAt: t - 1, closesAt: t + 1 }, t).state).toBe('closed');
  });
  it('is open with no dates', () => {
    expect(computeRegistrationStatus({ enabled: true }, t).isOpen).toBe(true);
  });
  it('treats opensAt as inclusive and closesAt as exclusive', () => {
    expect(computeRegistrationStatus({ enabled: true, opensAt: t }, t - 1).state).toBe('scheduled');
    expect(computeRegistrationStatus({ enabled: true, opensAt: t }, t).state).toBe('open');
    expect(computeRegistrationStatus({ enabled: true, closesAt: t }, t - 1).state).toBe('open');
    expect(computeRegistrationStatus({ enabled: true, closesAt: t }, t).state).toBe('ended');
  });
  it('reports the next automatic change', () => {
    expect(computeRegistrationStatus({ enabled: true, opensAt: t + 10, closesAt: t + 20 }, t).nextChangeAt).toBe(t + 10);
    expect(computeRegistrationStatus({ enabled: true, opensAt: t - 10, closesAt: t + 20 }, t).nextChangeAt).toBe(t + 20);
  });
});

describe('Manila time helpers', () => {
  it('round-trips datetime-local values at UTC+8', () => {
    const ms = manilaLocalToMillis('2026-06-30T17:00')!;
    expect(new Date(ms).toISOString()).toBe('2026-06-30T09:00:00.000Z');
    expect(millisToManilaLocal(ms)).toBe('2026-06-30T17:00');
    expect(formatManila(ms)).toBe('Jun 30, 2026, 5:00 PM');
  });
});

describe('scoreProgramAssessment', () => {
  const it_assessment = SEED_PROGRAM_ASSESSMENTS.find((a) => a.id === 'it_assessment')!;
  it('scores best answers at 100% and marks fit', () => {
    const answers = Object.fromEntries(it_assessment.questions.map((q) => [q.id, 'a']));
    const result = scoreProgramAssessment(it_assessment, answers);
    expect(result.scorePercent).toBe(100);
    expect(result.isFit).toBe(true);
    expect(result.answers).toHaveLength(5);
  });
  it('fixes the v1 bug: realistic answers score above 0%', () => {
    const answers = Object.fromEntries(it_assessment.questions.map((q) => [q.id, 'b']));
    const result = scoreProgramAssessment(it_assessment, answers);
    expect(result.scorePercent).toBe(52); // (3+7+5+5+6)/50
    expect(result.isFit).toBe(false);
  });
  it('scores an empty assessment as 0%, not 100%', () => {
    expect(scoreProgramAssessment({ questions: [], passingPercent: 75 }, {}).scorePercent).toBe(0);
  });
});

describe('seed catalog', () => {
  it('has 21 programs, each with a department, affinity and placeholder curriculum', () => {
    expect(SEED_PROGRAMS).toHaveLength(21);
    for (const program of SEED_PROGRAMS) {
      expect(program.departmentId).toBeTruthy();
      expect(Object.keys(program.dimensionAffinity).length).toBeGreaterThan(0);
      expect(program.curriculum.flatMap((t) => t.subjects).length).toBeGreaterThanOrEqual(4);
    }
    expect(SEED_PROGRAMS.find((p) => p.id === 'hospitality')!.tuitionPerTerm).toEqual({ min: 25000, max: 40000, currency: 'PHP' });
  });
  it('computes units-based curriculum progress', () => {
    const program = SEED_PROGRAMS.find((p) => p.id === 'it')!;
    const ids = program.curriculum.flatMap((t) => t.subjects.map((s) => s.id));
    const half = Object.fromEntries(ids.slice(0, 3).map((id) => [id, 'completed' as const]));
    expect(computeCurriculumProgress(program.curriculum, half).percent).toBe(50);
    const all = Object.fromEntries(ids.map((id) => [id, 'completed' as const]));
    expect(computeCurriculumProgress(program.curriculum, all).graduationReady).toBe(true);
  });
});
