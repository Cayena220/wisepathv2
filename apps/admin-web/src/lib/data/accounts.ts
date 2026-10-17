import { toNameLower, type Department, type RegistrationSettings, type UserDoc } from '@wisepath/shared';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { Actor } from '@/auth/AuthProvider';
import { auth, db, EMULATOR_HOST, firebaseConfig, useEmulators } from '@/lib/firebase';
import { generateTempPassword } from '@/lib/password';
import { withId } from '@/lib/utils';
import { addAudit, updateStamps, useLiveDoc, useLiveQuery } from './core';

// ================================================================ admins

export function useAdmins() {
  return useLiveQuery<UserDoc>(query(collection(db, 'users'), where('role', '==', 'admin')), ['admins']);
}

export function useUserDoc(uid: string | undefined) {
  return useLiveDoc<UserDoc>(uid ? doc(db, 'users', uid) : null, ['user', uid]);
}

export interface CreatedAdmin {
  uid: string;
  email: string;
  tempPassword: string;
}

/**
 * Creates a department admin without signing the Super Admin out (Spark plan, no Cloud Functions):
 * a throw-away secondary Firebase app creates the login, then one batch — written with the
 * Super Admin's own credentials — creates the users doc and claims the department's single slot.
 * Firestore rules reject the batch if the department already has an admin.
 */
export const createDepartmentAdmin = async (
  actor: Actor,
  input: { name: string; email: string; department: Department },
): Promise<CreatedAdmin> => {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().replace(/\s+/g, ' ');
  const fresh = await getDoc(doc(db, 'departments', input.department.id));
  if (fresh.get('adminUid')) throw new Error(`${input.department.name} already has an admin. Disable them first to replace them.`);
  if (fresh.get('status') !== 'active') throw new Error('This department is archived.');

  const tempPassword = generateTempPassword();
  const secondary = initializeApp(firebaseConfig, `admin-create-${crypto.randomUUID()}`);
  const secondaryAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
  if (useEmulators) connectAuthEmulator(secondaryAuth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });

  try {
    const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid), {
        email,
        role: 'admin',
        status: 'active',
        displayName: name,
        nameLower: toNameLower(name),
        departmentId: input.department.id,
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        createdBy: actor.uid,
        createdByName: actor.name,
        updatedAt: serverTimestamp(),
        updatedBy: actor.uid,
      });
      batch.update(doc(db, 'departments', input.department.id), {
        adminUid: user.uid,
        adminName: name,
        adminEmail: email,
        ...updateStamps(actor),
      });
      addAudit(batch, actor, {
        action: 'admin.create',
        targetType: 'admin',
        targetId: user.uid,
        targetLabel: `${name} <${email}>`,
        departmentId: input.department.id,
        details: { department: input.department.name },
      });
      await batch.commit();
      return { uid: user.uid, email, tempPassword };
    } catch (error) {
      await deleteUser(user).catch(() => undefined); // roll back the orphan login
      throw error;
    }
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondary).catch(() => undefined);
  }
};

export const disableAdmin = async (actor: Actor, admin: UserDoc) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', admin.id), {
    status: 'disabled',
    disabledAt: serverTimestamp(),
    disabledBy: actor.uid,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });
  if (admin.departmentId) {
    const dept = await getDoc(doc(db, 'departments', admin.departmentId));
    if (dept.get('adminUid') === admin.id) {
      batch.update(doc(db, 'departments', admin.departmentId), { adminUid: null, adminName: null, adminEmail: null, ...updateStamps(actor) });
    }
  }
  addAudit(batch, actor, {
    action: 'admin.disable',
    targetType: 'admin',
    targetId: admin.id,
    targetLabel: `${admin.displayName} <${admin.email}>`,
    departmentId: admin.departmentId ?? null,
  });
  await batch.commit();
};

export const enableAdmin = async (actor: Actor, admin: UserDoc) => {
  if (!admin.departmentId) throw new Error('This admin has no department.');
  const dept = await getDoc(doc(db, 'departments', admin.departmentId));
  if (dept.get('adminUid')) throw new Error(`${dept.get('name')} already has another admin. Only one admin per department.`);
  if (dept.get('status') !== 'active') throw new Error('The department is archived. Restore it first.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', admin.id), { status: 'active', disabledAt: null, disabledBy: null, updatedAt: serverTimestamp(), updatedBy: actor.uid });
  batch.update(doc(db, 'departments', admin.departmentId), {
    adminUid: admin.id,
    adminName: admin.displayName,
    adminEmail: admin.email,
    ...updateStamps(actor),
  });
  addAudit(batch, actor, {
    action: 'admin.enable',
    targetType: 'admin',
    targetId: admin.id,
    targetLabel: `${admin.displayName} <${admin.email}>`,
    departmentId: admin.departmentId,
  });
  await batch.commit();
};

export const sendAdminPasswordReset = async (actor: Actor, admin: UserDoc) => {
  await sendPasswordResetEmail(auth, admin.email);
  const batch = writeBatch(db);
  addAudit(batch, actor, {
    action: 'admin.reset_password',
    targetType: 'admin',
    targetId: admin.id,
    targetLabel: `${admin.displayName} <${admin.email}>`,
    departmentId: admin.departmentId ?? null,
  });
  await batch.commit();
};

// ================================================================ students (Super Admin)

export const STUDENT_PAGE = 25;

export function useStudents(search: string) {
  const term = search.trim().toLowerCase();
  return useQuery({
    queryKey: ['students', term],
    queryFn: async () => {
      const base = collection(db, 'users');
      const q = term
        ? query(base, where('role', '==', 'student'), where('nameLower', '>=', term), where('nameLower', '<=', `${term}`), orderBy('nameLower'), limit(STUDENT_PAGE))
        : query(base, where('role', '==', 'student'), orderBy('createdAt', 'desc'), limit(STUDENT_PAGE));
      const snap = await getDocs(q);
      return { rows: snap.docs.map((d) => withId<UserDoc>(d)), last: snap.docs.at(-1) ?? null };
    },
  });
}

export const loadMoreStudents = async (after: QueryDocumentSnapshot) => {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student'), orderBy('createdAt', 'desc'), startAfter(after), limit(STUDENT_PAGE)),
  );
  return { rows: snap.docs.map((d) => withId<UserDoc>(d)), last: snap.docs.at(-1) ?? null };
};

export function useStudentPhoto(uid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['photo', uid],
    enabled: Boolean(uid) && enabled,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'userPhotos', uid!));
      return (snap.get('dataUri') as string | undefined) ?? null;
    },
  });
}

// ================================================================ registration window

export function useRegistrationSettings() {
  return useLiveDoc<RegistrationSettings>(doc(db, 'settings', 'registration'), ['registration']);
}

export const saveRegistration = async (
  actor: Actor,
  input: { enabled: boolean; opensAt: number | null; closesAt: number | null; closedMessage: string | null },
  previous: RegistrationSettings | null,
) => {
  const data = {
    enabled: input.enabled,
    opensAt: input.opensAt == null ? null : Timestamp.fromMillis(input.opensAt),
    closesAt: input.closesAt == null ? null : Timestamp.fromMillis(input.closesAt),
    closedMessage: input.closedMessage?.trim() ? input.closedMessage.trim() : null,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByName: actor.name,
  };
  await setDoc(doc(db, 'settings', 'registration'), data);
  const batch = writeBatch(db);
  addAudit(batch, actor, {
    action: 'registration.update',
    targetType: 'registration',
    targetId: 'registration',
    targetLabel: input.enabled ? 'Registration enabled' : 'Registration disabled',
    departmentId: null,
    details: {
      enabled: input.enabled,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      before: previous
        ? { enabled: previous.enabled, opensAt: previous.opensAt?.toMillis() ?? null, closesAt: previous.closesAt?.toMillis() ?? null }
        : null,
    },
  });
  await batch.commit();
};
