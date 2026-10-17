export const COLLECTIONS = {
  users: 'users',
  userPhotos: 'userPhotos',
  departments: 'departments',
  programs: 'programs',
  careerQuestions: 'careerQuestions',
  programAssessments: 'programAssessments',
  careerResults: 'careerResults',
  programAssessmentAttempts: 'programAssessmentAttempts',
  studentProgress: 'studentProgress',
  settings: 'settings',
  auditLogs: 'auditLogs',
} as const;

export const SETTINGS_DOCS = {
  registration: 'registration',
  catalog: 'catalog',
  app: 'app',
  system: 'system',
} as const;

export const LIMITS = {
  /** Career questions a department admin may add on top of the system questions. */
  maxDeptCareerQuestions: 3,
  minAdminPasswordLength: 10,
  tempPasswordLength: 16,
  defaultPassingPercent: 75,
  maxPhotoDataUriLength: 150_000,
  pageSize: 25,
} as const;

/** Points a career-question option gives directly to the program it is tagged with. */
export const DIRECT_TAG_POINTS = 3;

/** Weight of profile signals relative to assessment answers. */
export const PROFILE_WEIGHT = 0.85;

/** Every program gets this bonus when the student's strand is GAS (General Academic Strand). */
export const GAS_ALL_PROGRAMS_BONUS = 0.5;

/** v1 = old app (index answers, hard-coded tables); v2 = data-driven engine. */
export const SCORING_VERSION = 2;
