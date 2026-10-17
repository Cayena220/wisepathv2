import { describe, expect, it } from 'vitest';
import { computeAttemptAnalytics, computeQuestionAnalytics, computeResultAnalytics } from '../analytics';
import { SEED_PROGRAM_ASSESSMENTS } from '../seed';
import type { CareerResult, ProgramAssessmentAttempt } from '../types';

const result = (id: string, overrides: Partial<CareerResult> & { strand?: string; interests?: string[] } = {}): CareerResult =>
  ({
    id,
    userId: `u_${id}`,
    studentSnapshot: {
      name: id,
      nameLower: id,
      email: `${id}@test`,
      studentStatus: 'incoming',
      shsStrand: overrides.strand ?? 'STEM',
      academicAverage: '',
      residenceType: 'urban',
      careerInterests: overrides.interests ?? ['Information Technology & Computing'],
      learningGoals: [],
      learningStyle: 'Mixed',
      currentSkills: 'Beginner',
      experience: '',
      affordabilityConsidered: false,
    },
    answers: [],
    dimensionScores: { service: 3, technology: 9, justice: 0 },
    rankings: [],
    top3: [
      { programId: 'it', programTitle: 'BSIT', programCode: 'BSIT', departmentId: 'computing', score: 10, matchPercent: 50 },
      { programId: 'hm', programTitle: 'BSHM', programCode: 'BSHM', departmentId: 'hospitality', score: 6, matchPercent: 30 },
      { programId: 'cs', programTitle: 'BSCS', programCode: 'BSCS', departmentId: 'computing', score: 4, matchPercent: 20 },
    ],
    topProgramIds: ['it', 'hm', 'cs'],
    topDepartmentIds: ['computing', 'hospitality'],
    bestProgramId: 'it',
    bestDepartmentId: 'computing',
    bestMatchPercent: 50,
    strengths: [],
    guidanceSummary: '',
    scoringVersion: 2,
    isLatest: true,
    completedAt: null,
    ...overrides,
  }) as CareerResult;

describe('computeResultAnalytics', () => {
  const results = [
    result('a'),
    result('b', { strand: 'ABM', interests: ['Business & Entrepreneurship', 'Information Technology & Computing'], bestMatchPercent: 62 }),
    result('c', { strand: 'Sports', bestDepartmentId: 'hospitality', bestMatchPercent: 35 }),
  ];

  it('groups strands in the profile-option order and keeps the ids for drill-down', () => {
    const a = computeResultAnalytics(results);
    expect(a.strands.map((s) => s.key)).toEqual(['STEM', 'ABM', 'Sports']);
    expect(a.strands[0]).toMatchObject({ count: 1, ids: ['a'] });
  });

  it('counts multi-valued interests per student and sorts them by count', () => {
    const a = computeResultAnalytics(results);
    expect(a.interests[0]).toMatchObject({ key: 'Information Technology & Computing', count: 3, share: 1 });
    expect(a.interests[1]).toMatchObject({ key: 'Business & Entrepreneurship', count: 1 });
  });

  it('bands the top-match share and scopes "best here" to the department', () => {
    const a = computeResultAnalytics(results, 'computing');
    expect(a.matchStrength.map((s) => s.count)).toEqual([1, 0, 1, 1]);
    expect(a.bestHere).toBe(2);
    expect(a.programs.map((p) => p.programId)).toEqual(['it', 'cs']);
    expect(a.programs[0]).toMatchObject({ top3Count: 3, bestCount: 3, avgMatch: 50 });
  });

  it('averages answer dimensions', () => {
    expect(computeResultAnalytics(results).dimensions.find((d) => d.id === 'technology')?.average).toBe(9);
  });
});

describe('computeAttemptAnalytics and computeQuestionAnalytics', () => {
  const assessment = SEED_PROGRAM_ASSESSMENTS.find((a) => a.id === 'it_assessment')!;
  const attempt = (id: string, userId: string, option: string, score: number): ProgramAssessmentAttempt =>
    ({
      id,
      userId,
      studentName: userId,
      studentEmail: '',
      programId: 'it',
      programTitle: 'BSIT',
      departmentId: 'computing',
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentVersion: 1,
      answers: assessment.questions.map((q) => ({ questionId: q.id, questionText: q.text, optionId: option, optionText: '', points: 0, maxPoints: 10 })),
      scorePercent: score,
      passingPercent: 75,
      isFit: score >= 75,
      completedAt: null,
    }) as ProgramAssessmentAttempt;
  const attempts = [attempt('x1', 'u1', 'a', 100), attempt('x2', 'u1', 'b', 52), attempt('x3', 'u2', 'b', 52)];

  it('summarises fit rate per assessment and distinct students', () => {
    const a = computeAttemptAnalytics(attempts);
    expect(a).toMatchObject({ total: 3, students: 2, fit: 1, fitStudents: 1, avgScore: 68 });
    expect(a.byAssessment[0]).toMatchObject({ attempts: 3, fit: 1 });
    expect(a.scoreBands.map((b) => b.count)).toEqual([0, 2, 0, 1]);
  });

  it('shows how often each question gets its best answer', () => {
    const q = computeQuestionAnalytics(assessment, attempts);
    expect(q).toHaveLength(5);
    expect(q[0].responses).toBe(3);
    expect(Math.round(q[0].bestShare * 100)).toBe(33);
    expect(q[0].options.find((o) => o.optionId === 'b')?.count).toBe(2);
  });
});
