import type {
  CareerQuestion,
  ContentStatus,
  Department,
  Program,
  ProgramAssessment,
} from '@wisepath/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Actor } from '@/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { withId } from '@/lib/utils';
import { addAudit, bumpCatalog, createStamps, updateStamps, useLiveQuery } from './core';

// ================================================================ departments (live)

export function useDepartments() {
  const state = useLiveQuery<Department>(query(collection(db, 'departments'), orderBy('order')), ['departments']);
  const byId = new Map((state.data ?? []).map((d) => [d.id, d]));
  return { ...state, departments: state.data ?? [], byId };
}

export interface DepartmentInput {
  name: string;
  code: string;
  description: string;
  color: string;
}

export const createDepartment = async (actor: Actor, id: string, input: DepartmentInput, order: number) => {
  const ref = doc(db, 'departments', id);
  if ((await getDoc(ref)).exists()) throw new Error('A department with that code already exists.');
  const batch = writeBatch(db);
  batch.set(ref, {
    ...input,
    order,
    status: 'active',
    adminUid: null,
    adminName: null,
    adminEmail: null,
    ...createStamps(actor),
  });
  addAudit(batch, actor, { action: 'department.create', targetType: 'department', targetId: id, targetLabel: input.name, departmentId: id });
  bumpCatalog(batch, actor);
  await batch.commit();
};

export const updateDepartment = async (actor: Actor, dept: Department, input: DepartmentInput) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'departments', dept.id), { ...input, ...updateStamps(actor) });
  addAudit(batch, actor, {
    action: 'department.update',
    targetType: 'department',
    targetId: dept.id,
    targetLabel: input.name,
    departmentId: dept.id,
    details: { from: { name: dept.name, code: dept.code } },
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

export const setDepartmentStatus = async (actor: Actor, dept: Department, status: ContentStatus) => {
  if (status === 'archived' && dept.adminUid) throw new Error('Disable this department’s admin before archiving it.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'departments', dept.id), { status, ...updateStamps(actor) });
  addAudit(batch, actor, {
    action: status === 'archived' ? 'department.archive' : 'department.restore',
    targetType: 'department',
    targetId: dept.id,
    targetLabel: dept.name,
    departmentId: dept.id,
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

// ================================================================ programs

export function usePrograms(departmentId?: string | null) {
  return useQuery({
    queryKey: ['programs', departmentId ?? 'all'],
    queryFn: async () => {
      const base = collection(db, 'programs');
      const q = departmentId ? query(base, where('departmentId', '==', departmentId)) : base;
      const snap = await getDocs(q);
      return snap.docs.map((d) => withId<Program>(d)).sort((a, b) => a.catalogOrder - b.catalogOrder || a.title.localeCompare(b.title));
    },
  });
}

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'programs', id!));
      return snap.exists() ? withId<Program>(snap) : null;
    },
  });
}

export type ProgramInput = Omit<Program, 'id' | keyof import('@wisepath/shared').Stamps | 'departmentId' | 'status' | 'catalogOrder'>;

export const saveProgram = async (actor: Actor, input: ProgramInput, existing?: Program | null) => {
  if (!actor.departmentId) throw new Error('Only a department admin can edit programs.');
  const batch = writeBatch(db);
  const ref = existing ? doc(db, 'programs', existing.id) : doc(collection(db, 'programs'));
  if (existing) {
    batch.update(ref, { ...input, ...updateStamps(actor) });
  } else {
    batch.set(ref, {
      ...input,
      departmentId: actor.departmentId,
      status: 'active',
      catalogOrder: 1000 + Math.floor(Date.now() / 1000) % 100000,
      ...createStamps(actor),
    });
  }
  addAudit(batch, actor, {
    action: existing ? 'program.update' : 'program.create',
    targetType: 'program',
    targetId: ref.id,
    targetLabel: `${input.code} · ${input.title}`,
  });
  bumpCatalog(batch, actor);
  await batch.commit();
  return ref.id;
};

export const setProgramStatus = async (actor: Actor, program: Program, status: ContentStatus) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'programs', program.id), { status, ...updateStamps(actor) });
  addAudit(batch, actor, {
    action: status === 'archived' ? 'program.archive' : 'program.restore',
    targetType: 'program',
    targetId: program.id,
    targetLabel: `${program.code} · ${program.title}`,
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

export const deleteProgram = async (actor: Actor, program: Program) => {
  await deleteDoc(doc(db, 'programs', program.id));
  const batch = writeBatch(db);
  addAudit(batch, actor, {
    action: 'program.delete',
    targetType: 'program',
    targetId: program.id,
    targetLabel: `${program.code} · ${program.title}`,
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

// ================================================================ career questions

export function useCareerQuestions() {
  return useQuery({
    queryKey: ['careerQuestions'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'careerQuestions'));
      return snap.docs
        .map((d) => withId<CareerQuestion>(d))
        .sort((a, b) => (a.scope === b.scope ? a.order - b.order : a.scope === 'system' ? -1 : 1));
    },
  });
}

export type QuestionInput = Pick<CareerQuestion, 'text' | 'options'>;

export const saveCareerQuestion = async (actor: Actor, input: QuestionInput, existing: CareerQuestion | null, order: number) => {
  const batch = writeBatch(db);
  const ref = existing ? doc(db, 'careerQuestions', existing.id) : doc(collection(db, 'careerQuestions'));
  const scope = actor.role === 'superadmin' ? 'system' : 'department';
  if (existing) {
    batch.update(ref, { ...input, ...updateStamps(actor) });
  } else {
    batch.set(ref, {
      ...input,
      order,
      scope,
      departmentId: scope === 'system' ? null : actor.departmentId,
      status: 'active',
      ...createStamps(actor),
    });
  }
  addAudit(batch, actor, {
    action: existing ? 'question.update' : 'question.create',
    targetType: 'careerQuestion',
    targetId: ref.id,
    targetLabel: input.text.slice(0, 80),
  });
  bumpCatalog(batch, actor);
  await batch.commit();
  return ref.id;
};

export const setQuestionStatus = async (actor: Actor, question: CareerQuestion, status: ContentStatus) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'careerQuestions', question.id), { status, ...updateStamps(actor) });
  addAudit(batch, actor, {
    action: status === 'archived' ? 'question.archive' : 'question.restore',
    targetType: 'careerQuestion',
    targetId: question.id,
    targetLabel: question.text.slice(0, 80),
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

export const deleteCareerQuestion = async (actor: Actor, question: CareerQuestion) => {
  await deleteDoc(doc(db, 'careerQuestions', question.id));
  const batch = writeBatch(db);
  addAudit(batch, actor, { action: 'question.delete', targetType: 'careerQuestion', targetId: question.id, targetLabel: question.text.slice(0, 80) });
  bumpCatalog(batch, actor);
  await batch.commit();
};

// ================================================================ program assessments

export function useProgramAssessments(departmentId?: string | null) {
  return useQuery({
    queryKey: ['programAssessments', departmentId ?? 'all'],
    queryFn: async () => {
      const base = collection(db, 'programAssessments');
      const q = departmentId ? query(base, where('departmentId', '==', departmentId)) : base;
      const snap = await getDocs(q);
      return snap.docs.map((d) => withId<ProgramAssessment>(d)).sort((a, b) => a.title.localeCompare(b.title));
    },
  });
}

export function useProgramAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ['programAssessment', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'programAssessments', id!));
      return snap.exists() ? withId<ProgramAssessment>(snap) : null;
    },
  });
}

export type AssessmentInput = Pick<ProgramAssessment, 'programId' | 'title' | 'description' | 'passingPercent' | 'questions'>;

export const saveProgramAssessment = async (actor: Actor, input: AssessmentInput, existing?: ProgramAssessment | null) => {
  if (!actor.departmentId) throw new Error('Only a department admin can edit program assessments.');
  const batch = writeBatch(db);
  const ref = existing ? doc(db, 'programAssessments', existing.id) : doc(collection(db, 'programAssessments'));
  if (existing) {
    const { programId: _ignored, ...rest } = input;
    batch.update(ref, { ...rest, version: (existing.version || 1) + 1, ...updateStamps(actor) });
  } else {
    batch.set(ref, { ...input, departmentId: actor.departmentId, version: 1, status: 'active', ...createStamps(actor) });
  }
  addAudit(batch, actor, {
    action: existing ? 'assessment.update' : 'assessment.create',
    targetType: 'programAssessment',
    targetId: ref.id,
    targetLabel: input.title,
    details: { programId: input.programId },
  });
  bumpCatalog(batch, actor);
  await batch.commit();
  return ref.id;
};

export const setAssessmentStatus = async (actor: Actor, assessment: ProgramAssessment, status: ContentStatus) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'programAssessments', assessment.id), { status, ...updateStamps(actor) });
  addAudit(batch, actor, {
    action: status === 'archived' ? 'assessment.archive' : 'assessment.restore',
    targetType: 'programAssessment',
    targetId: assessment.id,
    targetLabel: assessment.title,
  });
  bumpCatalog(batch, actor);
  await batch.commit();
};

export const deleteProgramAssessment = async (actor: Actor, assessment: ProgramAssessment) => {
  await deleteDoc(doc(db, 'programAssessments', assessment.id));
  const batch = writeBatch(db);
  addAudit(batch, actor, { action: 'assessment.delete', targetType: 'programAssessment', targetId: assessment.id, targetLabel: assessment.title });
  bumpCatalog(batch, actor);
  await batch.commit();
};

/** Invalidate catalog caches after a mutation. */
export function useInvalidateCatalog() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['programs'] }),
      client.invalidateQueries({ queryKey: ['program'] }),
      client.invalidateQueries({ queryKey: ['careerQuestions'] }),
      client.invalidateQueries({ queryKey: ['programAssessments'] }),
      client.invalidateQueries({ queryKey: ['programAssessment'] }),
      client.invalidateQueries({ queryKey: ['audit'] }),
    ]);
}
