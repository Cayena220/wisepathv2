import {
  SCORING_VERSION,
  buildGuidanceSummary,
  computeCurriculumProgress,
  computeRegistrationStatus,
  deriveStrengths,
  progressDocId,
  rankPrograms,
  scoreProgramAssessment,
  summarizeRanking,
  toNameLower,
  type CareerQuestion,
  type CareerResult,
  type Program,
  type ProgramAssessment,
  type RegistrationSettings,
  type StudentProfile,
  type SubjectState,
  type UserDoc,
} from '@wisepath/shared';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import * as React from 'react';
import { auth, db } from '../lib/firebase';
import { useLiveDoc, useNow } from '../lib/hooks';
import { useCatalog } from '../stores/catalog';
import { useSession } from '../stores/session';

// ================================================================ registration window

export function useRegistrationStatus() {
  const live = useLiveDoc<RegistrationSettings>(doc(db, 'settings', 'registration'), 'registration');
  const now = useNow(30_000);
  const status = computeRegistrationStatus(live.data ?? null, now);
  return { ...status, settings: live.data ?? null, loading: live.loading };
}

export class RegistrationClosedError extends Error {
  constructor() {
    super('Registration is closed.');
    this.name = 'RegistrationClosedError';
  }
}

// ================================================================ auth

export const signIn = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  return user;
};

/**
 * Creates the login, then the users doc. Firestore rules only accept the users doc while the
 * Super Admin's registration window is open (server time). If it is rejected, the new login is
 * deleted again and RegistrationClosedError is thrown.
 */
export const registerStudent = async (name: string, email: string, password: string) => {
  const session = useSession.getState();
  session.setRegistering(true);
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      await createStudentDoc(user.uid, user.email ?? email.trim().toLowerCase(), name);
    } catch (error) {
      await user.delete().catch(() => undefined);
      if ((error as { code?: string }).code === 'permission-denied') throw new RegistrationClosedError();
      throw error;
    }
  } finally {
    session.setRegistering(false);
  }
};

export const createStudentDoc = async (uid: string, email: string, name: string) => {
  const displayName = name.trim().replace(/\s+/g, ' ');
  await setDoc(doc(db, 'users', uid), {
    email,
    role: 'student',
    status: 'active',
    displayName,
    nameLower: toNameLower(displayName),
    profileComplete: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const signOut = async () => {
  useCatalog.getState().reset();
  await firebaseSignOut(auth);
};

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

export const changePassword = async (current: string, next: string) => {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not signed in.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
};

export const stampLogin = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(() => undefined);

// ================================================================ profile

export const saveProfile = async (uid: string, profile: StudentProfile) => {
  await updateDoc(doc(db, 'users', uid), {
    profile,
    profileComplete: true,
    displayName: profile.name.trim(),
    nameLower: toNameLower(profile.name),
    updatedAt: serverTimestamp(),
  });
};

export const savePhoto = async (uid: string, dataUri: string | null) => {
  if (dataUri) await setDoc(doc(db, 'userPhotos', uid), { dataUri, updatedAt: serverTimestamp() });
  else await deleteDoc(doc(db, 'userPhotos', uid));
  await updateDoc(doc(db, 'users', uid), { hasPhoto: Boolean(dataUri), updatedAt: serverTimestamp() });
};

export const setActiveProgram = (uid: string, programId: string | null) =>
  updateDoc(doc(db, 'users', uid), { activeProgramId: programId, updatedAt: serverTimestamp() });

// ================================================================ career assessment

export interface SubmitCareerInput {
  uid: string;
  account: UserDoc;
  programs: Program[];
  questions: CareerQuestion[];
  answers: Record<string, string>;
}

/**
 * Scores the assessment with the shared engine and writes, in one batch:
 * the new result (isLatest), the previous latest result (isLatest=false) and users.latestResult.
 */
export const submitCareerAssessment = async ({ uid, account, programs, questions, answers }: SubmitCareerInput) => {
  const profile = account.profile!;
  const { rankings, dimensionScores, affordabilityConsidered } = rankPrograms({ programs, questions, answers, profile });
  const summary = summarizeRanking(rankings);
  const programsById = new Map(programs.map((p) => [p.id, p]));
  const previous = await getDocs(query(collection(db, 'careerResults'), where('userId', '==', uid), where('isLatest', '==', true)));

  const ref = doc(collection(db, 'careerResults'));
  const batch = writeBatch(db);
  batch.set(ref, {
    userId: uid,
    studentSnapshot: {
      name: profile.name,
      nameLower: toNameLower(profile.name),
      email: account.email,
      studentStatus: profile.studentStatus,
      shsStrand: profile.shsStrand,
      academicAverage: profile.academicAverage ?? '',
      residenceType: profile.residenceType,
      careerInterests: profile.careerInterests,
      learningGoals: profile.learningGoals,
      learningStyle: profile.learningStyle,
      currentSkills: profile.currentSkills,
      experience: profile.experience,
      affordabilityConsidered,
    },
    answers: questions
      .filter((q) => answers[q.id])
      .map((q) => {
        const option = q.options.find((o) => o.id === answers[q.id])!;
        return { questionId: q.id, questionText: q.text, optionId: option.id, optionText: option.text, scope: q.scope, departmentId: q.departmentId };
      }),
    dimensionScores,
    rankings,
    ...summary,
    strengths: deriveStrengths(profile, rankings, programsById),
    guidanceSummary: buildGuidanceSummary(profile, summary.top3, dimensionScores),
    scoringVersion: SCORING_VERSION,
    isLatest: true,
    completedAt: serverTimestamp(),
  });
  previous.docs.forEach((d) => batch.update(d.ref, { isLatest: false }));
  const best = summary.top3[0];
  batch.update(doc(db, 'users', uid), {
    hasCareerResult: true,
    latestResult: {
      resultId: ref.id,
      bestProgramId: best.programId,
      bestProgramTitle: best.programTitle,
      bestDepartmentId: best.departmentId,
      topProgramIds: summary.topProgramIds,
      bestMatchPercent: best.matchPercent,
      completedAt: serverTimestamp(),
    },
    ...(account.activeProgramId ? {} : { activeProgramId: best.programId }),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return ref.id;
};

export const getResult = async (id: string) => {
  const snap = await getDoc(doc(db, 'careerResults', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CareerResult) : null;
};

export const myResultsQuery = (uid: string) =>
  query(collection(db, 'careerResults'), where('userId', '==', uid), orderBy('completedAt', 'desc'), limit(30));

/** Deletes one result; if it was the latest, the next most recent becomes the latest. */
export const deleteResult = async (uid: string, result: CareerResult, all: CareerResult[]) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'careerResults', result.id));
  if (result.isLatest) {
    const next = all.filter((r) => r.id !== result.id).sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))[0];
    if (next) {
      batch.update(doc(db, 'careerResults', next.id), { isLatest: true });
      const best = next.top3[0];
      batch.update(doc(db, 'users', uid), {
        latestResult: {
          resultId: next.id,
          bestProgramId: best.programId,
          bestProgramTitle: best.programTitle,
          bestDepartmentId: best.departmentId,
          topProgramIds: next.topProgramIds,
          bestMatchPercent: best.matchPercent,
          completedAt: next.completedAt,
        },
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'users', uid), { latestResult: null, hasCareerResult: false, updatedAt: serverTimestamp() });
    }
  }
  await batch.commit();
};

// ================================================================ program assessments

export const submitProgramAssessment = async (input: {
  uid: string;
  account: UserDoc;
  assessment: ProgramAssessment;
  program: Program;
  answers: Record<string, string>;
}) => {
  const score = scoreProgramAssessment(input.assessment, input.answers);
  const ref = doc(collection(db, 'programAssessmentAttempts'));
  await setDoc(ref, {
    userId: input.uid,
    studentName: input.account.profile?.name || input.account.displayName,
    studentEmail: input.account.email,
    programId: input.program.id,
    programTitle: input.program.title,
    departmentId: input.program.departmentId,
    assessmentId: input.assessment.id,
    assessmentTitle: input.assessment.title,
    assessmentVersion: input.assessment.version ?? 1,
    answers: score.answers,
    scorePercent: score.scorePercent,
    passingPercent: input.assessment.passingPercent,
    isFit: score.isFit,
    completedAt: serverTimestamp(),
  });
  return ref.id;
};

export const myAttemptsQuery = (uid: string) =>
  query(collection(db, 'programAssessmentAttempts'), where('userId', '==', uid), orderBy('completedAt', 'desc'), limit(50));

// ================================================================ progress

export const progressRef = (uid: string, programId: string) => doc(db, 'studentProgress', progressDocId(uid, programId));

export const saveProgress = async (input: {
  uid: string;
  name: string;
  program: Program;
  yearLevel: number;
  semester: number;
  subjectStatus: Record<string, SubjectState>;
}) => {
  const progress = computeCurriculumProgress(input.program.curriculum, input.subjectStatus);
  await setDoc(progressRef(input.uid, input.program.id), {
    userId: input.uid,
    programId: input.program.id,
    departmentId: input.program.departmentId,
    studentName: input.name,
    yearLevel: input.yearLevel,
    semester: input.semester,
    subjectStatus: input.subjectStatus,
    completedUnits: progress.completedUnits,
    totalUnits: progress.totalUnits,
    percent: progress.percent,
    graduationReady: progress.graduationReady,
    updatedAt: serverTimestamp(),
  });
};

// ================================================================ small hooks

export function useCatalogData() {
  const state = useCatalog();
  React.useEffect(() => {
    if (state.status === 'idle') void state.load();
  }, [state]);
  return state;
}
