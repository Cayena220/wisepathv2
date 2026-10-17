import {
  computeAttemptAnalytics,
  computeResultAnalytics,
  lastWeeks,
  type CareerResult,
  type ProgramAssessmentAttempt,
} from '@wisepath/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Timestamp,
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { withId } from '@/lib/utils';

/**
 * Analytics read the latest result of up to this many students (and this many fit checks).
 * Cached for 10 minutes, so a dashboard visit costs at most ~1,000 reads on the free plan,
 * and usually far fewer.
 */
export const SAMPLE_LIMIT = 500;

export interface AnalyticsSample {
  results: CareerResult[];
  attempts: ProgramAssessmentAttempt[];
  resultsCapped: boolean;
  attemptsCapped: boolean;
  fetchedAt: number;
}

/** departmentId = scope (required for department admins; optional filter for the Super Admin). */
export function useAnalyticsSample(departmentId: string | null) {
  return useQuery({
    queryKey: ['analyticsSample', departmentId ?? 'all'],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<AnalyticsSample> => {
      const resultConstraints: QueryConstraint[] = departmentId
        ? [where('topDepartmentIds', 'array-contains', departmentId), where('isLatest', '==', true)]
        : [where('isLatest', '==', true)];
      const attemptConstraints: QueryConstraint[] = departmentId ? [where('departmentId', '==', departmentId)] : [];
      const [results, attempts] = await Promise.all([
        getDocs(query(collection(db, 'careerResults'), ...resultConstraints, orderBy('completedAt', 'desc'), limit(SAMPLE_LIMIT))),
        getDocs(query(collection(db, 'programAssessmentAttempts'), ...attemptConstraints, orderBy('completedAt', 'desc'), limit(SAMPLE_LIMIT))),
      ]);
      return {
        results: results.docs.map((d) => withId<CareerResult>(d)),
        attempts: attempts.docs.map((d) => withId<ProgramAssessmentAttempt>(d)),
        resultsCapped: results.size >= SAMPLE_LIMIT,
        attemptsCapped: attempts.size >= SAMPLE_LIMIT,
        fetchedAt: Date.now(),
      };
    },
    select: (sample) => ({
      ...sample,
      resultStats: computeResultAnalytics(sample.results, departmentId),
      attemptStats: computeAttemptAnalytics(sample.attempts),
    }),
  });
}

export interface FunnelStep {
  key: string;
  label: string;
  hint: string;
  value: number;
  to: string;
}

const countOf = async (...args: Parameters<typeof query>) => (await getCountFromServer(query(...args))).data().count;

/** Super Admin funnel from exact counts on student accounts. */
export function useStudentFunnel(enabled: boolean) {
  return useQuery({
    queryKey: ['studentFunnel'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FunnelStep[]> => {
      const users = collection(db, 'users');
      const student = where('role', '==', 'student');
      const [registered, profiled, assessed, fitChecked, following] = await Promise.all([
        countOf(users, student),
        countOf(users, student, where('profileComplete', '==', true)),
        countOf(users, student, where('hasCareerResult', '==', true)),
        countOf(users, student, where('hasFitAttempt', '==', true)),
        countOf(users, student, where('activeProgramId', '!=', null)),
      ]);
      return [
        { key: 'registered', label: 'Registered', hint: 'Created an account on Android', value: registered, to: '/students' },
        { key: 'profiled', label: 'Completed profile', hint: 'Finished the profile wizard', value: profiled, to: '/students' },
        { key: 'assessed', label: 'Took career assessment', hint: 'Have at least one result', value: assessed, to: '/results?view=latest' },
        { key: 'fit', label: 'Took a fit check', hint: 'Finished a program assessment', value: fitChecked, to: '/results?tab=attempts' },
        { key: 'following', label: 'Following a program', hint: 'Chose a program to track', value: following, to: '/students' },
      ];
    },
  });
}

export interface WeeklyPoint {
  label: string;
  start: number;
  end: number;
  [series: string]: number | string;
}

/**
 * Weekly counts for the last 8 weeks (two series on one count axis).
 * Super Admin: new students and career assessments. Department admin: career assessments
 * that include the department and its fit checks.
 */
export function useWeeklyTrends(departmentId: string | null, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: ['weeklyTrends', departmentId ?? 'all', isSuperAdmin],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WeeklyPoint[]> => {
      const weeks = lastWeeks(8);
      const range = (field: string, w: { start: number; end: number }) => [
        where(field, '>=', Timestamp.fromMillis(w.start)),
        where(field, '<', Timestamp.fromMillis(w.end)),
      ];
      const results = collection(db, 'careerResults');
      const attempts = collection(db, 'programAssessmentAttempts');
      const users = collection(db, 'users');
      const rows = await Promise.all(
        weeks.map(async (w) => {
          const assessments = departmentId
            ? await countOf(results, where('topDepartmentIds', 'array-contains', departmentId), ...range('completedAt', w))
            : await countOf(results, ...range('completedAt', w));
          const second =
            isSuperAdmin && !departmentId
              ? await countOf(users, where('role', '==', 'student'), ...range('createdAt', w))
              : departmentId
                ? await countOf(attempts, where('departmentId', '==', departmentId), ...range('completedAt', w))
                : await countOf(attempts, ...range('completedAt', w));
          return { ...w, assessments, second };
        }),
      );
      return rows;
    },
  });
}

/** All attempts of one program assessment (up to SAMPLE_LIMIT), for the per-question analysis. */
export function useAssessmentAttempts(assessmentId: string | undefined, departmentId: string | null, isSuperAdmin: boolean, enabled: boolean) {
  return useQuery({
    queryKey: ['assessmentAttempts', assessmentId, isSuperAdmin ? 'all' : departmentId],
    enabled: Boolean(assessmentId) && enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const constraints: QueryConstraint[] = [where('assessmentId', '==', assessmentId)];
      if (!isSuperAdmin && departmentId) constraints.unshift(where('departmentId', '==', departmentId));
      const snap = await getDocs(query(collection(db, 'programAssessmentAttempts'), ...constraints, orderBy('completedAt', 'desc'), limit(SAMPLE_LIMIT)));
      return snap.docs.map((d) => withId<ProgramAssessmentAttempt>(d));
    },
  });
}
