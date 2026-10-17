/** Option lists for the student profile. Values are stored verbatim in Firestore and read by the scoring engine. */

export type StudentStatus = 'incoming' | 'current';
export type ResidenceType = 'urban' | 'rural';
export type IncomeLevel =
  | 'below_10k'
  | '10k_20k'
  | '20k_40k'
  | '40k_70k'
  | 'above_70k'
  | 'prefer_not_to_say';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LearningStyle = 'Visual' | 'Hands-on' | 'Reading' | 'Mixed';
export type Experience = 'No Experience' | '1-3 years' | '3+ years';

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const STUDENT_STATUS_OPTIONS: Option<StudentStatus>[] = [
  { value: 'incoming', label: 'Incoming college student' },
  { value: 'current', label: 'Current college student' },
];

export const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Arts and Design', 'Sports', 'N/A'] as const;

export const RESIDENCE_TYPE_OPTIONS: Option<ResidenceType>[] = [
  { value: 'urban', label: 'Urban' },
  { value: 'rural', label: 'Rural' },
];

export const PARENTAL_INCOME_OPTIONS: Option<IncomeLevel>[] = [
  { value: 'below_10k', label: 'Below ₱10,000' },
  { value: '10k_20k', label: '₱10,000 – ₱20,000' },
  { value: '20k_40k', label: '₱20,000 – ₱40,000' },
  { value: '40k_70k', label: '₱40,000 – ₱70,000' },
  { value: 'above_70k', label: 'Above ₱70,000' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const CAREER_INTEREST_OPTIONS = [
  'Hospitality & Tourism',
  'Information Technology & Computing',
  'Law Enforcement & Public Safety',
  'Business & Entrepreneurship',
  'Healthcare & Wellness',
  'Education & Teaching',
  'Engineering & Technical Trades',
  'Arts, Media & Design',
  'Government & Public Service',
  'Science & Research',
] as const;

export const LEARNING_GOALS_OPTIONS = [
  'Gain hands-on skills for immediate employment',
  "Prepare for advanced studies (e.g. Master's, Law, Med)",
  'Build a strong theoretical foundation',
  'Learn leadership and management skills',
  'Master technical or digital tools',
  'Improve communication and soft skills',
  'Understand industry standards and ethics',
  'Explore personal interests before committing',
] as const;

export const SKILL_LEVEL_OPTIONS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
export const LEARNING_STYLE_OPTIONS: LearningStyle[] = ['Visual', 'Hands-on', 'Reading', 'Mixed'];
export const EXPERIENCE_OPTIONS: Experience[] = ['No Experience', '1-3 years', '3+ years'];

export const labelFor = <T extends string>(options: Option<T>[], value: string | null | undefined): string =>
  options.find((option) => option.value === value)?.label ?? (value || '—');

export const incomeLabel = (value: string | null | undefined) => labelFor(PARENTAL_INCOME_OPTIONS, value);
export const studentStatusLabel = (value: string | null | undefined) => labelFor(STUDENT_STATUS_OPTIONS, value);
export const residenceLabel = (value: string | null | undefined) => labelFor(RESIDENCE_TYPE_OPTIONS, value);
