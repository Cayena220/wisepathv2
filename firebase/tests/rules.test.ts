import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const FAR_PAST = Timestamp.fromMillis(Date.UTC(2000, 0, 1));
const FAR_FUTURE = Timestamp.fromMillis(Date.UTC(2099, 0, 1));

const SA = { uid: 'sa', claims: { superadmin: true, email: 'sa@wisepath.test' } };
const ADMIN = { uid: 'admin_cc', claims: { email: 'cc@wisepath.test' } }; // computing, active
const ADMIN_NEW = { uid: 'admin_eng', claims: { email: 'eng@wisepath.test' } }; // engineering, must change password
const ADMIN_OFF = { uid: 'admin_off', claims: { email: 'off@wisepath.test' } }; // disabled
const LEGACY = { uid: 'legacy', claims: { email: 'legacy@wisepath.test' } }; // v1 self-registered admin
const STUDENT = { uid: 'stu1', claims: { email: 'stu1@wisepath.test' } };
const NEWBIE = { uid: 'stu_new', claims: { email: 'new@wisepath.test' } };

const as = (who: { uid: string; claims: Record<string, unknown> }): Firestore =>
  env.authenticatedContext(who.uid, who.claims).firestore() as unknown as Firestore;

const stamps = (by = 'sa') => ({
  createdAt: Timestamp.now(),
  createdBy: by,
  createdByName: 'Seed',
  updatedAt: Timestamp.now(),
  updatedBy: by,
  updatedByName: 'Seed',
});

const programDoc = (departmentId: string, extra: Record<string, unknown> = {}) => ({
  code: 'BSIT',
  title: 'Bachelor of Science in Information Technology',
  description: 'IT program',
  departmentId,
  difficulty: 'intermediate',
  durationYears: 4,
  tuitionPerTerm: { min: 30000, max: 45000, currency: 'PHP' },
  skills: ['Programming'],
  careerPaths: ['Developer'],
  curriculum: [],
  dimensionAffinity: { technology: 1 },
  matchSignals: { careerInterests: {}, shsStrands: {}, learningGoals: {}, learningStyles: {}, skillLevels: {} },
  catalogOrder: 1,
  status: 'active',
  ...extra,
});

const setRegistration = (data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, 'settings/registration'), {
      enabled: true,
      opensAt: null,
      closesAt: null,
      closedMessage: null,
      ...data,
    });
  });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wisepath',
    firestore: {
      rules: readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    const dept = (id: string, adminUid: string | null) => ({
      name: `Dept ${id}`,
      code: id.toUpperCase().slice(0, 6),
      description: '',
      color: '#3E7A6C',
      order: 1,
      status: 'active',
      adminUid,
      adminName: adminUid,
      adminEmail: null,
      ...stamps(),
    });
    await setDoc(doc(db, 'departments/computing'), dept('computing', 'admin_cc'));
    await setDoc(doc(db, 'departments/engineering'), dept('engineering', 'admin_eng'));
    await setDoc(doc(db, 'departments/business'), dept('business', null));
    await setDoc(doc(db, 'departments/education'), dept('education', null));

    await setDoc(doc(db, 'users/sa'), { email: 'sa@wisepath.test', role: 'superadmin', status: 'active', displayName: 'SA', nameLower: 'sa' });
    await setDoc(doc(db, 'users/admin_cc'), {
      email: 'cc@wisepath.test', role: 'admin', status: 'active', departmentId: 'computing', mustChangePassword: false, displayName: 'CC', nameLower: 'cc',
    });
    await setDoc(doc(db, 'users/admin_eng'), {
      email: 'eng@wisepath.test', role: 'admin', status: 'active', departmentId: 'engineering', mustChangePassword: true, displayName: 'ENG', nameLower: 'eng',
    });
    await setDoc(doc(db, 'users/admin_off'), {
      email: 'off@wisepath.test', role: 'admin', status: 'disabled', departmentId: 'business', mustChangePassword: false, displayName: 'OFF', nameLower: 'off',
    });
    await setDoc(doc(db, 'users/legacy'), { email: 'legacy@wisepath.test', role: 'admin', profileComplete: true });
    await setDoc(doc(db, 'users/stu1'), {
      email: 'stu1@wisepath.test', role: 'student', status: 'active', displayName: 'Stu', nameLower: 'stu', profileComplete: true,
    });

    await setDoc(doc(db, 'programs/it'), { ...programDoc('computing'), ...stamps() });
    await setDoc(doc(db, 'programs/civil'), { ...programDoc('engineering', { code: 'BSCE', title: 'Civil Engineering' }), ...stamps() });
    await setDoc(doc(db, 'programs/old'), { ...programDoc('computing', { status: 'archived' }), ...stamps() });

    await setDoc(doc(db, 'careerQuestions/q1'), {
      text: 'Which activities energize you?', order: 1, scope: 'system', departmentId: null, status: 'active',
      options: [{ id: 'a', text: 'A', dimensionWeights: { service: 3 }, programId: null }, { id: 'b', text: 'B', dimensionWeights: {}, programId: null }],
      ...stamps(),
    });
    await setDoc(doc(db, 'programAssessments/it_assessment'), {
      programId: 'it', departmentId: 'computing', title: 'IT fit check', description: '', passingPercent: 75, version: 1,
      questions: [{ id: 'x', text: 'Q', options: [{ id: 'a', text: 'A', points: 10 }] }], status: 'active', ...stamps(),
    });

    await setDoc(doc(db, 'careerResults/r_cc'), {
      userId: 'stu1', topProgramIds: ['it'], topDepartmentIds: ['computing', 'business'], bestProgramId: 'it', bestDepartmentId: 'computing',
      isLatest: true, completedAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'careerResults/r_eng'), {
      userId: 'stu1', topProgramIds: ['civil'], topDepartmentIds: ['engineering'], bestProgramId: 'civil', bestDepartmentId: 'engineering',
      isLatest: false, completedAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'settings/catalog'), { updatedAt: Timestamp.now(), updatedBy: 'sa' });
    await setDoc(doc(db, 'auditLogs/log1'), { actorUid: 'sa', action: 'system.seed', departmentId: null, createdAt: Timestamp.now() });
  });
  await setRegistration({});
});

// ------------------------------------------------------------------ registration window
describe('student registration window', () => {
  const register = (db: Firestore) =>
    setDoc(doc(db, 'users', NEWBIE.uid), {
      email: 'new@wisepath.test',
      role: 'student',
      status: 'active',
      displayName: 'New',
      nameLower: 'new',
      profileComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

  it('allows sign-up while open', async () => {
    await assertSucceeds(register(as(NEWBIE)));
  });
  it('blocks sign-up when the Super Admin disables registration', async () => {
    await setRegistration({ enabled: false });
    await assertFails(register(as(NEWBIE)));
  });
  it('blocks sign-up before opensAt', async () => {
    await setRegistration({ opensAt: FAR_FUTURE });
    await assertFails(register(as(NEWBIE)));
  });
  it('blocks sign-up after closesAt (end of enrollment)', async () => {
    await setRegistration({ closesAt: FAR_PAST });
    await assertFails(register(as(NEWBIE)));
  });
  it('allows sign-up inside a scheduled window', async () => {
    await setRegistration({ opensAt: FAR_PAST, closesAt: FAR_FUTURE });
    await assertSucceeds(register(as(NEWBIE)));
  });
  it('lets anyone read the registration settings, but only the Super Admin change them', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore() as unknown as Firestore, 'settings/registration')));
    const payload = { enabled: false, opensAt: null, closesAt: FAR_FUTURE, closedMessage: 'Closed', updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(as(ADMIN), 'settings/registration'), { ...payload, updatedBy: ADMIN.uid }));
    await assertSucceeds(setDoc(doc(as(SA), 'settings/registration'), { ...payload, updatedBy: SA.uid }));
  });
});

// ------------------------------------------------------------------ roles cannot be self-assigned
describe('role escalation', () => {
  const base = { email: 'new@wisepath.test', status: 'active', displayName: 'X', nameLower: 'x', profileComplete: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  it('denies self-registering as admin or superadmin', async () => {
    await assertFails(setDoc(doc(as(NEWBIE), 'users', NEWBIE.uid), { ...base, role: 'admin' }));
    await assertFails(setDoc(doc(as(NEWBIE), 'users', NEWBIE.uid), { ...base, role: 'superadmin' }));
  });
  it('denies a student changing their role or status', async () => {
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT.uid), { role: 'admin', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT.uid), { status: 'disabled', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT.uid), { displayName: 'Stu B', updatedAt: serverTimestamp() }));
  });
  it('treats v1 self-registered admins as inert', async () => {
    await assertFails(setDoc(doc(as(LEGACY), 'programs/new1'), { ...programDoc('computing'), ...stampsFor(LEGACY.uid) }));
    await assertFails(getDoc(doc(as(LEGACY), 'careerResults/r_cc')));
  });
});

const stampsFor = (by: string) => ({
  createdAt: serverTimestamp(),
  createdBy: by,
  createdByName: by,
  updatedAt: serverTimestamp(),
  updatedBy: by,
  updatedByName: by,
});
const updateStampsFor = (by: string) => ({ updatedAt: serverTimestamp(), updatedBy: by, updatedByName: by });

// ------------------------------------------------------------------ one admin per department
describe('admin accounts', () => {
  const adminDoc = (departmentId: string) => ({
    email: 'newadmin@wisepath.test',
    role: 'admin',
    status: 'active',
    displayName: 'New Admin',
    nameLower: 'new admin',
    departmentId,
    mustChangePassword: true,
    createdAt: serverTimestamp(),
    createdBy: SA.uid,
    createdByName: 'SA',
    updatedAt: serverTimestamp(),
    updatedBy: SA.uid,
  });
  const claim = (db: Firestore, departmentId: string, newUid: string) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', newUid), adminDoc(departmentId));
    batch.update(doc(db, 'departments', departmentId), {
      adminUid: newUid, adminName: 'New Admin', adminEmail: 'newadmin@wisepath.test', ...updateStampsFor(SA.uid),
    });
    return batch.commit();
  };

  it('lets the Super Admin create an admin by claiming an empty department slot', async () => {
    await assertSucceeds(claim(as(SA), 'education', 'admin_edu'));
  });
  it('rejects a second admin for a department that already has one', async () => {
    await assertFails(claim(as(SA), 'computing', 'admin_cc2'));
  });
  it('rejects an admin doc without the slot claim in the same batch', async () => {
    await assertFails(setDoc(doc(as(SA), 'users/admin_edu'), adminDoc('education')));
  });
  it('rejects admin creation by anyone but the Super Admin', async () => {
    await assertFails(claim(as(ADMIN), 'education', 'admin_edu'));
  });
  it('disables an admin and releases the slot atomically', async () => {
    const db = as(SA);
    const batch = writeBatch(db);
    batch.update(doc(db, 'users/admin_cc'), { status: 'disabled', disabledAt: serverTimestamp(), disabledBy: SA.uid, updatedAt: serverTimestamp(), updatedBy: SA.uid });
    batch.update(doc(db, 'departments/computing'), { adminUid: null, adminName: null, adminEmail: null, ...updateStampsFor(SA.uid) });
    await assertSucceeds(batch.commit());
  });
  it('refuses to disable an admin while leaving them in the slot', async () => {
    await assertFails(updateDoc(doc(as(SA), 'users/admin_cc'), { status: 'disabled', updatedAt: serverTimestamp(), updatedBy: SA.uid }));
  });
  it('lets an admin sync only their own name on their own department', async () => {
    const db = as(ADMIN);
    await assertSucceeds(updateDoc(doc(db, 'departments/computing'), { adminName: 'CC', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(updateDoc(doc(db, 'departments/computing'), { adminName: 'Someone else', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(updateDoc(doc(db, 'departments/computing'), { name: 'Renamed', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(updateDoc(doc(db, 'departments/engineering'), { adminName: 'CC', ...updateStampsFor(ADMIN.uid) }));
  });
  it('only lets an admin flip mustChangePassword from true to false', async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN_NEW), 'users', ADMIN_NEW.uid), {
      mustChangePassword: false, passwordChangedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(as(ADMIN), 'users', ADMIN.uid), { mustChangePassword: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(ADMIN), 'users', ADMIN.uid), { departmentId: 'engineering', updatedAt: serverTimestamp() }));
  });
});

// ------------------------------------------------------------------ ownership of department content
describe('department content ownership', () => {
  it('lets the department admin create, edit, archive and delete their own programs', async () => {
    const db = as(ADMIN);
    await assertSucceeds(setDoc(doc(db, 'programs/cs'), { ...programDoc('computing', { code: 'BSCS' }), ...stampsFor(ADMIN.uid) }));
    await assertSucceeds(updateDoc(doc(db, 'programs/it'), { title: 'BS Information Technology', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(deleteDoc(doc(db, 'programs/it'))); // must archive first
    await assertSucceeds(deleteDoc(doc(db, 'programs/old')));
  });
  it('blocks editing another department’s program or moving a program to another department', async () => {
    const db = as(ADMIN);
    await assertFails(updateDoc(doc(db, 'programs/civil'), { title: 'Hijacked', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(updateDoc(doc(db, 'programs/it'), { departmentId: 'engineering', ...updateStampsFor(ADMIN.uid) }));
    await assertFails(setDoc(doc(db, 'programs/x'), { ...programDoc('engineering'), ...stampsFor(ADMIN.uid) }));
  });
  it('blocks an admin who has not changed the temporary password', async () => {
    await assertFails(updateDoc(doc(as(ADMIN_NEW), 'programs/civil'), { title: 'Civil Eng', ...updateStampsFor(ADMIN_NEW.uid) }));
  });
  it('blocks a disabled admin', async () => {
    await assertFails(setDoc(doc(as(ADMIN_OFF), 'programs/biz'), { ...programDoc('business'), ...stampsFor(ADMIN_OFF.uid) }));
    await assertFails(getDoc(doc(as(ADMIN_OFF), 'careerResults/r_cc')));
  });
  it('keeps the Super Admin read-only on department programs', async () => {
    await assertSucceeds(getDoc(doc(as(SA), 'programs/old')));
    await assertFails(updateDoc(doc(as(SA), 'programs/it'), { title: 'Changed', ...updateStampsFor(SA.uid) }));
  });
  it('lets the Super Admin manage system questions and admins manage only department questions', async () => {
    await assertSucceeds(updateDoc(doc(as(SA), 'careerQuestions/q1'), { text: 'Which activities energize you most?', ...updateStampsFor(SA.uid) }));
    await assertFails(updateDoc(doc(as(ADMIN), 'careerQuestions/q1'), { text: 'Changed by admin!', ...updateStampsFor(ADMIN.uid) }));
    const own = {
      text: 'Do you enjoy building apps?', order: 100, scope: 'department', departmentId: 'computing', status: 'active',
      options: [{ id: 'a', text: 'Yes', dimensionWeights: {}, programId: 'it' }, { id: 'b', text: 'No', dimensionWeights: {}, programId: null }],
    };
    await assertSucceeds(setDoc(doc(as(ADMIN), 'careerQuestions/dq1'), { ...own, ...stampsFor(ADMIN.uid) }));
    await assertFails(setDoc(doc(as(ADMIN), 'careerQuestions/dq2'), { ...own, departmentId: 'engineering', ...stampsFor(ADMIN.uid) }));
  });
  it('only lets an admin attach program assessments to their own programs', async () => {
    const assessment = {
      departmentId: 'computing', title: 'Fit check', description: '', passingPercent: 75, version: 1, status: 'active',
      questions: [{ id: 'x', text: 'Q', options: [{ id: 'a', text: 'A', points: 10 }] }],
    };
    await assertSucceeds(setDoc(doc(as(ADMIN), 'programAssessments/a1'), { ...assessment, programId: 'it', ...stampsFor(ADMIN.uid) }));
    await assertFails(setDoc(doc(as(ADMIN), 'programAssessments/a2'), { ...assessment, programId: 'civil', ...stampsFor(ADMIN.uid) }));
  });
});

// ------------------------------------------------------------------ results visibility
describe('results visibility', () => {
  it('scopes career results to the admin’s department', async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN), 'careerResults/r_cc')));
    await assertFails(getDoc(doc(as(ADMIN), 'careerResults/r_eng')));
    await assertSucceeds(getDocs(query(collection(as(ADMIN), 'careerResults'), where('topDepartmentIds', 'array-contains', 'computing'))));
    await assertFails(getDocs(query(collection(as(ADMIN), 'careerResults'))));
    await assertFails(getDocs(query(collection(as(ADMIN), 'careerResults'), where('topDepartmentIds', 'array-contains', 'engineering'))));
  });
  it('lets the Super Admin and the owner read everything of their own', async () => {
    await assertSucceeds(getDocs(collection(as(SA), 'careerResults')));
    await assertSucceeds(getDocs(query(collection(as(STUDENT), 'careerResults'), where('userId', '==', STUDENT.uid))));
    await assertFails(getDocs(collection(as(STUDENT), 'careerResults')));
  });
  it('validates a student’s new result against the program’s department', async () => {
    const result = {
      userId: STUDENT.uid, topProgramIds: ['it', 'civil'], topDepartmentIds: ['computing', 'engineering'],
      bestProgramId: 'it', bestDepartmentId: 'computing', isLatest: true, scoringVersion: 2, completedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(as(STUDENT), 'careerResults/new'), result));
    await assertFails(setDoc(doc(as(STUDENT), 'careerResults/bad'), { ...result, bestDepartmentId: 'engineering' }));
    await assertFails(setDoc(doc(as(STUDENT), 'careerResults/other'), { ...result, userId: 'someone_else' }));
  });
  it('validates program-fit attempts', async () => {
    const attempt = {
      userId: STUDENT.uid, programId: 'it', departmentId: 'computing', assessmentId: 'it_assessment',
      passingPercent: 75, scorePercent: 80, isFit: true, completedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(as(STUDENT), 'programAssessmentAttempts/a1'), attempt));
    await assertFails(setDoc(doc(as(STUDENT), 'programAssessmentAttempts/a2'), { ...attempt, departmentId: 'engineering' }));
    await assertFails(setDoc(doc(as(STUDENT), 'programAssessmentAttempts/a3'), { ...attempt, scorePercent: 50, isFit: true }));
  });
  it('lets a student read their own (missing) progress doc and write it', async () => {
    await assertSucceeds(getDoc(doc(as(STUDENT), 'studentProgress/stu1__it')));
    await assertSucceeds(setDoc(doc(as(STUDENT), 'studentProgress/stu1__it'), {
      userId: STUDENT.uid, programId: 'it', departmentId: 'computing', percent: 10, updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(as(NEWBIE), 'studentProgress/stu1__it')));
  });
});

// ------------------------------------------------------------------ audit trail
describe('audit log', () => {
  it('is append-only', async () => {
    await assertFails(updateDoc(doc(as(SA), 'auditLogs/log1'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(as(SA), 'auditLogs/log1')));
  });
  it('lets admins write entries only for their own department', async () => {
    const entry = {
      actorUid: ADMIN.uid, actorName: 'CC', actorRole: 'admin', action: 'program.update', targetType: 'program',
      targetId: 'it', targetLabel: 'BSIT', details: {}, createdAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(as(ADMIN), 'auditLogs/x1'), { ...entry, departmentId: 'computing' }));
    await assertFails(setDoc(doc(as(ADMIN), 'auditLogs/x2'), { ...entry, departmentId: 'engineering' }));
  });
});
