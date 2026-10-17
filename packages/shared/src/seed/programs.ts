import { LEGACY_DIMENSION_MAP, type DimensionWeights } from '../constants/dimensions';
import type { CurriculumTerm, MatchSignals, Program } from '../types';
import { parseTuitionRange, slugify } from '../utils';
import { PROGRAM_DEPARTMENT_MAP } from './departments';
import {
  LEGACY_ASSESSMENT_AFFINITY,
  LEGACY_CAREER_INTEREST_WEIGHTS,
  LEGACY_COURSES,
  LEGACY_LEARNING_GOAL_WEIGHTS,
  LEGACY_LEARNING_STYLE_WEIGHTS,
  LEGACY_SHS_STRAND_WEIGHTS,
  LEGACY_SKILL_LEVEL_WEIGHTS,
} from './legacyCatalog';

export type SeedProgram = Omit<Program, keyof import('../types').Stamps>;

export const PROGRAM_CODES: Record<string, string> = {
  computer_science: 'BSCS',
  it: 'BSIT',
  civil_engineering: 'BSCE',
  mechanical_engineering: 'BSME',
  electrical_engineering: 'BSEE',
  business_financial_management: 'BSBA-FM',
  business_marketing_management: 'BSBA-MM',
  accountancy: 'BSA',
  management_accounting: 'BSMA',
  hospitality: 'BSHM',
  communication: 'BAComm',
  psychology: 'BSPsych',
  english_language: 'BAEL',
  mathematics: 'BSMath',
  physical_education: 'BPEd',
  early_childhood_education: 'BECEd',
  elementary_education: 'BEEd',
  secondary_education_english: 'BSEd-Eng',
  secondary_education_filipino: 'BSEd-Fil',
  tourism_management: 'BSTM',
  criminal_justice: 'BSCrim',
};

/** Strands that the profile form offers. GAS is handled by the engine (0.5 to every program). */
const SEED_STRANDS = ['STEM', 'ABM', 'HUMSS', 'TVL', 'Arts and Design', 'Sports'];

const pick = (table: Record<string, Partial<Record<string, number>>>, programId: string, keys?: string[]) => {
  const out: Record<string, number> = {};
  for (const key of keys ?? Object.keys(table)) {
    const value = table[key]?.[programId];
    if (value) out[key] = value;
  }
  return out;
};

export const legacySignalsFor = (programId: string): MatchSignals => ({
  careerInterests: pick(LEGACY_CAREER_INTEREST_WEIGHTS, programId),
  shsStrands: pick(LEGACY_SHS_STRAND_WEIGHTS, programId, SEED_STRANDS),
  learningGoals: pick(LEGACY_LEARNING_GOAL_WEIGHTS, programId),
  learningStyles: pick(LEGACY_LEARNING_STYLE_WEIGHTS, programId),
  skillLevels: pick(LEGACY_SKILL_LEVEL_WEIGHTS, programId),
});

export const legacyAffinityFor = (programId: string): DimensionWeights => {
  const out: DimensionWeights = {};
  for (const [legacyDimension, value] of Object.entries(LEGACY_ASSESSMENT_AFFINITY[programId] ?? {})) {
    const dimension = LEGACY_DIMENSION_MAP[legacyDimension];
    if (dimension && value) out[dimension] = value;
  }
  return out;
};

/**
 * v1 curricula were flat lists of 4–6 subjects. Spread them across the 8 regular
 * terms as placeholders; department admins complete the real curriculum on the website.
 */
export const placeholderCurriculum = (programCode: string, subjects: string[]): CurriculumTerm[] => {
  const terms = new Map<string, CurriculumTerm>();
  subjects.forEach((title, index) => {
    const slot = Math.floor((index * 8) / subjects.length);
    const year = Math.floor(slot / 2) + 1;
    const semester = ((slot % 2) + 1) as 1 | 2;
    const key = `${year}-${semester}`;
    if (!terms.has(key)) terms.set(key, { year, semester, subjects: [] });
    const term = terms.get(key)!;
    const code = `${programCode.split('-')[0].toUpperCase()} ${year}${semester}${term.subjects.length + 1}`;
    term.subjects.push({ id: slugify(title), code, title, units: 3 });
  });
  return [...terms.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);
};

export const SEED_PROGRAMS: SeedProgram[] = LEGACY_COURSES.map((course, index) => ({
  id: course.id,
  code: PROGRAM_CODES[course.id] ?? course.id.toUpperCase(),
  title: course.title,
  description: course.description,
  departmentId: PROGRAM_DEPARTMENT_MAP[course.id],
  difficulty: course.difficulty,
  durationYears: Number.parseInt(course.duration, 10) || 4,
  tuitionPerTerm: parseTuitionRange(course.estimatedTuitionPerTerm),
  skills: course.skills,
  careerPaths: course.careerPaths,
  curriculum: placeholderCurriculum(PROGRAM_CODES[course.id] ?? course.id, course.curriculum),
  dimensionAffinity: legacyAffinityFor(course.id),
  matchSignals: legacySignalsFor(course.id),
  catalogOrder: index,
  status: 'active',
}));
