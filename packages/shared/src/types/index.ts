import type { DimensionId, DimensionWeights } from '../constants/dimensions';
import type {
  Experience,
  IncomeLevel,
  LearningStyle,
  ResidenceType,
  SkillLevel,
  StudentStatus,
} from '../constants/profileOptions';

/** Structural type satisfied by both the web SDK and the Admin SDK Timestamp. */
export interface FireTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

export type Role = 'student' | 'admin' | 'superadmin' | 'legacy_admin';
export type AccountStatus = 'active' | 'disabled';
export type ContentStatus = 'active' | 'archived';

export interface Stamps {
  createdAt?: FireTimestamp | null;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: FireTimestamp | null;
  updatedBy?: string;
  updatedByName?: string;
}

// ---------------------------------------------------------------- departments

export interface Department extends Stamps {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  order: number;
  status: ContentStatus;
  /** The single admin slot. Only one admin per department. */
  adminUid: string | null;
  adminName: string | null;
  adminEmail: string | null;
}

// ---------------------------------------------------------------- users

export interface StudentProfile {
  name: string;
  studentStatus: StudentStatus;
  shsStrand: string;
  academicAverage?: string;
  residenceType: ResidenceType;
  parentalIncomeLevel: IncomeLevel;
  careerInterests: string[];
  learningGoals: string[];
  currentSkills: SkillLevel;
  learningStyle: LearningStyle;
  experience: Experience | string;
}

export interface LatestResultSummary {
  resultId: string;
  bestProgramId: string;
  bestProgramTitle: string;
  bestDepartmentId: string;
  topProgramIds: string[];
  bestMatchPercent: number;
  completedAt: FireTimestamp | null;
}

export interface UserDoc {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  displayName: string;
  nameLower: string;
  createdAt?: FireTimestamp | null;
  updatedAt?: FireTimestamp | null;
  lastLoginAt?: FireTimestamp | null;
  // student
  profileComplete?: boolean;
  profile?: StudentProfile;
  activeProgramId?: string | null;
  latestResult?: LatestResultSummary | null;
  hasCareerResult?: boolean;
  hasPhoto?: boolean;
  // admin
  departmentId?: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: FireTimestamp | null;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  disabledAt?: FireTimestamp | null;
  disabledBy?: string | null;
}

// ---------------------------------------------------------------- programs

export interface CurriculumSubject {
  id: string;
  code: string;
  title: string;
  units: number;
}

/** semester 3 = summer term */
export interface CurriculumTerm {
  year: number;
  semester: 1 | 2 | 3;
  subjects: CurriculumSubject[];
}

export interface MatchSignals {
  careerInterests: Record<string, number>;
  shsStrands: Record<string, number>;
  learningGoals: Record<string, number>;
  learningStyles: Record<string, number>;
  skillLevels: Record<string, number>;
}

export interface TuitionRange {
  min: number;
  max: number;
  currency: 'PHP';
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Program extends Stamps {
  id: string;
  code: string;
  title: string;
  description: string;
  departmentId: string;
  difficulty: Difficulty;
  durationYears: number;
  tuitionPerTerm: TuitionRange | null;
  skills: string[];
  careerPaths: string[];
  curriculum: CurriculumTerm[];
  dimensionAffinity: DimensionWeights;
  matchSignals: MatchSignals;
  catalogOrder: number;
  status: ContentStatus;
}

// ---------------------------------------------------------------- career assessment

export interface CareerQuestionOption {
  id: string;
  text: string;
  dimensionWeights: DimensionWeights;
  /** When set, the option gives DIRECT_TAG_POINTS to this program instead of dimension weights. */
  programId: string | null;
}

export type QuestionScope = 'system' | 'department';

export interface CareerQuestion extends Stamps {
  id: string;
  text: string;
  order: number;
  scope: QuestionScope;
  departmentId: string | null;
  options: CareerQuestionOption[];
  status: ContentStatus;
}

// ---------------------------------------------------------------- program assessments

export interface ProgramAssessmentOption {
  id: string;
  text: string;
  /** 0–10 */
  points: number;
}

export interface ProgramAssessmentQuestion {
  id: string;
  text: string;
  options: ProgramAssessmentOption[];
}

export interface ProgramAssessment extends Stamps {
  id: string;
  programId: string;
  departmentId: string;
  title: string;
  description: string;
  passingPercent: number;
  version: number;
  questions: ProgramAssessmentQuestion[];
  status: ContentStatus;
}

// ---------------------------------------------------------------- results

export interface RankedProgram {
  programId: string;
  programTitle: string;
  programCode: string;
  departmentId: string;
  score: number;
  matchPercent: number;
}

export interface CareerAnswer {
  questionId: string;
  questionText: string;
  optionId: string;
  optionText: string;
  scope: QuestionScope;
  departmentId: string | null;
}

export interface StudentSnapshot {
  name: string;
  nameLower: string;
  email: string;
  studentStatus: string;
  shsStrand: string;
  academicAverage: string;
  residenceType: string;
  careerInterests: string[];
  learningGoals: string[];
  learningStyle: string;
  currentSkills: string;
  experience: string;
  /** The income value itself is never copied into results. */
  affordabilityConsidered: boolean;
}

export interface CareerResult {
  id: string;
  userId: string;
  studentSnapshot: StudentSnapshot;
  answers: CareerAnswer[];
  dimensionScores: Record<DimensionId, number>;
  rankings: RankedProgram[];
  top3: RankedProgram[];
  topProgramIds: string[];
  topDepartmentIds: string[];
  bestProgramId: string;
  bestDepartmentId: string;
  bestMatchPercent: number;
  strengths: string[];
  guidanceSummary: string;
  scoringVersion: number;
  isLatest: boolean;
  completedAt: FireTimestamp | null;
  migratedFrom?: string;
}

export interface AttemptAnswer {
  questionId: string;
  questionText: string;
  optionId: string;
  optionText: string;
  points: number;
  maxPoints: number;
}

export interface ProgramAssessmentAttempt {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  programId: string;
  programTitle: string;
  departmentId: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentVersion: number;
  answers: AttemptAnswer[];
  scorePercent: number;
  passingPercent: number;
  isFit: boolean;
  completedAt: FireTimestamp | null;
}

export type SubjectState = 'completed' | 'ongoing';

export interface StudentProgress {
  id: string;
  userId: string;
  programId: string;
  departmentId: string;
  studentName: string;
  yearLevel: number;
  semester: number;
  subjectStatus: Record<string, SubjectState>;
  completedUnits: number;
  totalUnits: number;
  percent: number;
  graduationReady: boolean;
  updatedAt: FireTimestamp | null;
}

// ---------------------------------------------------------------- settings & audit

export interface RegistrationSettings {
  enabled: boolean;
  opensAt: FireTimestamp | null;
  closesAt: FireTimestamp | null;
  closedMessage: string | null;
  updatedAt?: FireTimestamp | null;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CatalogSettings {
  updatedAt: FireTimestamp | null;
  updatedBy?: string;
}

export type AuditAction =
  | 'department.create'
  | 'department.update'
  | 'department.archive'
  | 'department.restore'
  | 'admin.create'
  | 'admin.disable'
  | 'admin.enable'
  | 'admin.reset_password'
  | 'admin.password_changed'
  | 'registration.update'
  | 'program.create'
  | 'program.update'
  | 'program.archive'
  | 'program.restore'
  | 'program.delete'
  | 'question.create'
  | 'question.update'
  | 'question.archive'
  | 'question.restore'
  | 'question.delete'
  | 'assessment.create'
  | 'assessment.update'
  | 'assessment.archive'
  | 'assessment.restore'
  | 'assessment.delete'
  | 'system.bootstrap'
  | 'system.seed'
  | 'system.migrate';

export type AuditTargetType =
  | 'department'
  | 'admin'
  | 'registration'
  | 'program'
  | 'careerQuestion'
  | 'programAssessment'
  | 'system';

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: Role | 'system';
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  departmentId: string | null;
  details: Record<string, unknown>;
  createdAt: FireTimestamp | null;
}
