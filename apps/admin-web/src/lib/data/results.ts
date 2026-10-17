import type {
  AuditLog,
  CareerResult,
  ProgramAssessmentAttempt,
  StudentProgress,
} from '@wisepath/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Timestamp,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withId } from '@/lib/utils';

export const PAGE_SIZE = 25;
const DAY = 86_400_000;

export type ResultView = 'all' | 'latest' | 'best';

export interface ResultFilters {
  /** Department scope. Always set for department admins (the rules demand it); optional for the Super Admin. */
  departmentId: string | null;
  isSuperAdmin: boolean;
  view: ResultView;
  programId?: string | null;
  sinceDays?: number | null;
  from?: number | null;
  to?: number | null;
  search?: string;
}

/** Builds a query that always carries the constraint the rules need. */
const resultConstraints = (f: ResultFilters): QueryConstraint[] => {
  const c: QueryConstraint[] = [];
  const search = f.search?.trim().toLowerCase();
  if (f.departmentId) c.push(where('topDepartmentIds', 'array-contains', f.departmentId));
  if (search) {
    c.push(where('studentSnapshot.nameLower', '>=', search), where('studentSnapshot.nameLower', '<=', `${search}`));
    c.push(orderBy('studentSnapshot.nameLower'));
    return c;
  }
  if (f.programId) {
    c.push(where('bestProgramId', '==', f.programId), where('isLatest', '==', true));
  } else if (f.view === 'best' && f.departmentId) {
    c.push(where('bestDepartmentId', '==', f.departmentId), where('isLatest', '==', true));
  } else if (f.view === 'latest') {
    c.push(where('isLatest', '==', true));
  } else if (f.from || f.to) {
    if (f.from) c.push(where('completedAt', '>=', Timestamp.fromMillis(f.from)));
    if (f.to) c.push(where('completedAt', '<', Timestamp.fromMillis(f.to)));
  } else if (f.sinceDays) {
    c.push(where('completedAt', '>=', Timestamp.fromMillis(Date.now() - f.sinceDays * DAY)));
  }
  c.push(orderBy('completedAt', 'desc'));
  return c;
};

export function useCareerResults(filters: ResultFilters) {
  return useQuery({
    queryKey: ['results', filters],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'careerResults'), ...resultConstraints(filters), limit(PAGE_SIZE)));
      return { rows: snap.docs.map((d) => withId<CareerResult>(d)), last: snap.docs.at(-1) ?? null };
    },
  });
}

export const loadMoreResults = async (filters: ResultFilters, after: QueryDocumentSnapshot) => {
  const snap = await getDocs(query(collection(db, 'careerResults'), ...resultConstraints(filters), startAfter(after), limit(PAGE_SIZE)));
  return { rows: snap.docs.map((d) => withId<CareerResult>(d)), last: snap.docs.at(-1) ?? null };
};

export function useCareerResult(id: string | undefined) {
  return useQuery({
    queryKey: ['result', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'careerResults', id!));
      return snap.exists() ? withId<CareerResult>(snap) : null;
    },
  });
}

/** One student's results — scoped to the admin's department, or all for the Super Admin. */
export function useStudentResults(uid: string | undefined, departmentId: string | null, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: ['studentResults', uid, isSuperAdmin ? 'all' : departmentId],
    enabled: Boolean(uid),
    queryFn: async () => {
      const c: QueryConstraint[] = [where('userId', '==', uid)];
      if (!isSuperAdmin && departmentId) c.unshift(where('topDepartmentIds', 'array-contains', departmentId));
      const snap = await getDocs(query(collection(db, 'careerResults'), ...c, orderBy('completedAt', 'desc'), limit(50)));
      return snap.docs.map((d) => withId<CareerResult>(d));
    },
  });
}

// ================================================================ program-fit attempts

export interface AttemptFilters {
  departmentId: string | null;
  isSuperAdmin: boolean;
  assessmentId?: string | null;
  programId?: string | null;
  userId?: string | null;
}

const attemptConstraints = (f: AttemptFilters): QueryConstraint[] => {
  const c: QueryConstraint[] = [];
  if (!f.isSuperAdmin && f.departmentId) c.push(where('departmentId', '==', f.departmentId));
  if (f.assessmentId) c.push(where('assessmentId', '==', f.assessmentId));
  else if (f.programId) c.push(where('programId', '==', f.programId));
  else if (f.userId) c.push(where('userId', '==', f.userId));
  c.push(orderBy('completedAt', 'desc'));
  return c;
};

export function useAttempts(filters: AttemptFilters, enabled = true) {
  return useQuery({
    queryKey: ['attempts', filters],
    enabled,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'programAssessmentAttempts'), ...attemptConstraints(filters), limit(PAGE_SIZE)));
      return { rows: snap.docs.map((d) => withId<ProgramAssessmentAttempt>(d)), last: snap.docs.at(-1) ?? null };
    },
  });
}

export const loadMoreAttempts = async (filters: AttemptFilters, after: QueryDocumentSnapshot) => {
  const snap = await getDocs(
    query(collection(db, 'programAssessmentAttempts'), ...attemptConstraints(filters), startAfter(after), limit(PAGE_SIZE)),
  );
  return { rows: snap.docs.map((d) => withId<ProgramAssessmentAttempt>(d)), last: snap.docs.at(-1) ?? null };
};

export function useAttempt(id: string | undefined) {
  return useQuery({
    queryKey: ['attempt', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'programAssessmentAttempts', id!));
      return snap.exists() ? withId<ProgramAssessmentAttempt>(snap) : null;
    },
  });
}

export function useStudentProgress(uid: string | undefined, departmentId: string | null, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: ['progress', uid, isSuperAdmin ? 'all' : departmentId],
    enabled: Boolean(uid),
    queryFn: async () => {
      const c: QueryConstraint[] = [where('userId', '==', uid)];
      if (!isSuperAdmin && departmentId) c.unshift(where('departmentId', '==', departmentId));
      const snap = await getDocs(query(collection(db, 'studentProgress'), ...c));
      return snap.docs.map((d) => withId<StudentProgress>(d));
    },
  });
}

// ================================================================ dashboard statistics (count() — cheap on Spark)

const count = async (...constraints: QueryConstraint[]) =>
  (await getCountFromServer(query(collection(db, 'careerResults'), ...constraints))).data().count;

export interface DepartmentStats {
  matchedStudents: number;
  bestMatchStudents: number;
  results30d: number;
  attempts: number;
  fitAttempts: number;
  programCounts: Record<string, number>;
}

export function useDepartmentStats(departmentId: string | null, programIds: string[]) {
  return useQuery({
    queryKey: ['deptStats', departmentId, programIds],
    enabled: Boolean(departmentId),
    staleTime: 60_000,
    queryFn: async (): Promise<DepartmentStats> => {
      const D = departmentId!;
      const inDept = where('topDepartmentIds', 'array-contains', D);
      const now = Date.now();
      const attemptsBase = collection(db, 'programAssessmentAttempts');
      const [matched, best, recent, attempts, fit, perProgram] = await Promise.all([
        count(inDept, where('isLatest', '==', true)),
        count(inDept, where('bestDepartmentId', '==', D), where('isLatest', '==', true)),
        count(inDept, where('completedAt', '>=', Timestamp.fromMillis(now - 30 * DAY))),
        getCountFromServer(query(attemptsBase, where('departmentId', '==', D))).then((r) => r.data().count),
        getCountFromServer(query(attemptsBase, where('departmentId', '==', D), where('isFit', '==', true))).then((r) => r.data().count),
        Promise.all(programIds.map((p) => count(inDept, where('bestProgramId', '==', p), where('isLatest', '==', true)))),
      ]);
      return {
        matchedStudents: matched,
        bestMatchStudents: best,
        results30d: recent,
        attempts,
        fitAttempts: fit,
        programCounts: Object.fromEntries(programIds.map((p, i) => [p, perProgram[i]])),
      };
    },
  });
}

export interface OverviewStats {
  students: number;
  studentsWithResult: number;
  results: number;
  results30d: number;
  attempts: number;
  departmentCounts: Record<string, number>;
}

export function useOverviewStats(departmentIds: string[]) {
  return useQuery({
    queryKey: ['overviewStats', departmentIds],
    staleTime: 60_000,
    queryFn: async (): Promise<OverviewStats> => {
      const now = Date.now();
      const users = collection(db, 'users');
      const [students, withResult, results, recent, attempts, perDept] = await Promise.all([
        getCountFromServer(query(users, where('role', '==', 'student'))).then((r) => r.data().count),
        getCountFromServer(query(users, where('role', '==', 'student'), where('hasCareerResult', '==', true))).then((r) => r.data().count),
        count(),
        count(where('completedAt', '>=', Timestamp.fromMillis(now - 30 * DAY))),
        getCountFromServer(collection(db, 'programAssessmentAttempts')).then((r) => r.data().count),
        Promise.all(departmentIds.map((d) => count(where('bestDepartmentId', '==', d), where('isLatest', '==', true)))),
      ]);
      return {
        students,
        studentsWithResult: withResult,
        results,
        results30d: recent,
        attempts,
        departmentCounts: Object.fromEntries(departmentIds.map((d, i) => [d, perDept[i]])),
      };
    },
  });
}

/** Latest results + fit attempts, merged newest first, for "Recent activity". */
export function useRecentActivity(departmentId: string | null, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: ['recentActivity', isSuperAdmin ? 'all' : departmentId],
    staleTime: 30_000,
    queryFn: async () => {
      const resultsQ = isSuperAdmin
        ? query(collection(db, 'careerResults'), orderBy('completedAt', 'desc'), limit(8))
        : query(collection(db, 'careerResults'), where('topDepartmentIds', 'array-contains', departmentId), orderBy('completedAt', 'desc'), limit(8));
      const attemptsQ = isSuperAdmin
        ? query(collection(db, 'programAssessmentAttempts'), orderBy('completedAt', 'desc'), limit(8))
        : query(collection(db, 'programAssessmentAttempts'), where('departmentId', '==', departmentId), orderBy('completedAt', 'desc'), limit(8));
      const [results, attempts] = await Promise.all([getDocs(resultsQ), getDocs(attemptsQ)]);
      type Item =
        | { kind: 'result'; at: number; result: CareerResult }
        | { kind: 'attempt'; at: number; attempt: ProgramAssessmentAttempt };
      const items: Item[] = [
        ...results.docs.map((d) => {
          const result = withId<CareerResult>(d);
          return { kind: 'result' as const, at: result.completedAt?.toMillis() ?? 0, result };
        }),
        ...attempts.docs.map((d) => {
          const attempt = withId<ProgramAssessmentAttempt>(d);
          return { kind: 'attempt' as const, at: attempt.completedAt?.toMillis() ?? 0, attempt };
        }),
      ];
      return items.sort((a, b) => b.at - a.at).slice(0, 10);
    },
  });
}

// ================================================================ audit log

export interface AuditFilters {
  departmentId: string | null;
  isSuperAdmin: boolean;
  targetId?: string | null;
  action?: string | null;
  max?: number;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => {
      const c: QueryConstraint[] = [];
      if (!filters.isSuperAdmin && filters.departmentId) c.push(where('departmentId', '==', filters.departmentId));
      if (filters.targetId) c.push(where('targetId', '==', filters.targetId));
      else if (filters.action) c.push(where('action', '==', filters.action));
      const snap = await getDocs(query(collection(db, 'auditLogs'), ...c, orderBy('createdAt', 'desc'), limit(filters.max ?? 50)));
      return snap.docs.map((d) => withId<AuditLog>(d));
    },
  });
}
