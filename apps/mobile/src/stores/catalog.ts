import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CareerQuestion, Department, Program, ProgramAssessment } from '@wisepath/shared';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../lib/firebase';

const CACHE_KEY = 'wisepath:catalog:v2';

interface CatalogData {
  version: number;
  departments: Department[];
  programs: Program[];
  questions: CareerQuestion[];
  assessments: ProgramAssessment[];
}

interface CatalogState extends CatalogData {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: (force?: boolean) => Promise<void>;
  reset: () => void;
}

const empty: CatalogData = { version: 0, departments: [], programs: [], questions: [], assessments: [] };

const withId = <T,>(d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as object) }) as T;

/** Firestore Timestamps don't survive JSON; the app never needs catalog timestamps, so drop them. */
const strip = <T,>(rows: T[]): T[] =>
  rows.map((row) => {
    const copy = { ...(row as Record<string, unknown>) };
    for (const key of ['createdAt', 'updatedAt']) delete copy[key];
    return copy as T;
  });

/**
 * Catalog cache: one read of settings/catalog per launch; the full catalog (~60 reads) is
 * fetched only when an admin changed something since the cached copy. Keeps the free
 * Spark plan's daily read quota comfortable.
 */
export const useCatalog = create<CatalogState>((set, get) => ({
  ...empty,
  status: 'idle',
  error: null,
  reset: () => set({ ...empty, status: 'idle', error: null }),
  load: async (force = false) => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const meta = await getDoc(doc(db, 'settings', 'catalog'));
      const version = (meta.get('updatedAt') as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
      if (!force) {
        const cachedText = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (cachedText) {
          const cached = JSON.parse(cachedText) as CatalogData;
          if (cached.version === version && cached.programs.length) {
            set({ ...cached, status: 'ready' });
            return;
          }
        }
      }
      const [departments, programs, questions, assessments] = await Promise.all([
        getDocs(collection(db, 'departments')),
        getDocs(query(collection(db, 'programs'), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'careerQuestions'), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'programAssessments'), where('status', '==', 'active'))),
      ]);
      const data: CatalogData = {
        version,
        departments: strip(departments.docs.map((d) => withId<Department>(d))),
        programs: strip(programs.docs.map((d) => withId<Program>(d))),
        questions: strip(questions.docs.map((d) => withId<CareerQuestion>(d))),
        assessments: strip(assessments.docs.map((d) => withId<ProgramAssessment>(d))),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => undefined);
      set({ ...data, status: 'ready' });
    } catch (error) {
      const cachedText = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (cachedText) {
        set({ ...(JSON.parse(cachedText) as CatalogData), status: 'ready', error: 'Showing saved programs (offline).' });
      } else {
        set({ status: 'error', error: (error as Error).message ?? 'Could not load programs.' });
      }
    }
  },
}));

// ---------------------------------------------------------------- selectors

export const activeDepartments = (s: CatalogData) =>
  s.departments.filter((d) => d.status === 'active').sort((a, b) => a.order - b.order);

/** Programs of active departments only, in catalog order. */
export const matchablePrograms = (s: CatalogData) => {
  const active = new Set(activeDepartments(s).map((d) => d.id));
  return s.programs.filter((p) => active.has(p.departmentId)).sort((a, b) => a.catalogOrder - b.catalogOrder);
};

/** Core (system) questions first, then each active department's questions. */
export const orderedQuestions = (s: CatalogData) => {
  const depts = activeDepartments(s);
  const deptOrder = new Map(depts.map((d, i) => [d.id, i]));
  return s.questions
    .filter((q) => q.scope === 'system' || (q.departmentId && deptOrder.has(q.departmentId)))
    .sort((a, b) => {
      if (a.scope !== b.scope) return a.scope === 'system' ? -1 : 1;
      if (a.scope === 'department' && a.departmentId !== b.departmentId) {
        return (deptOrder.get(a.departmentId!) ?? 0) - (deptOrder.get(b.departmentId!) ?? 0);
      }
      return a.order - b.order;
    });
};
