/**
 * EMULATOR ONLY. Creates fake students with results, fit attempts and progress so the
 * website's dashboards and drill-downs have something to show.
 *
 *   npm run demo -- --emulator [--students 40]
 */
import {
  CAREER_INTEREST_OPTIONS,
  LEARNING_GOALS_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  PARENTAL_INCOME_OPTIONS,
  SHS_STRANDS,
  SKILL_LEVEL_OPTIONS,
  buildGuidanceSummary,
  computeCurriculumProgress,
  deriveStrengths,
  progressDocId,
  rankPrograms,
  scoreProgramAssessment,
  summarizeRanking,
  toNameLower,
  type CareerQuestion,
  type Program,
  type ProgramAssessment,
} from '@wisepath/shared';
import { args, auth, db, isEmulator, log, Timestamp } from './lib/admin';
import { DEMO_STUDENT_PASSWORD, EMULATOR_DEPT_ADMIN_PASSWORD } from './fixtures';

if (!isEmulator) {
  console.error('demo-data only runs against the emulator (--emulator).');
  process.exit(1);
}

const count = Number(args.values.students ?? 40);
log.title(`Creating ${count} demo students in the emulator`);

const programs = (await db.collection('programs').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Program);
const questions = (await db.collection('careerQuestions').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as CareerQuestion);
const assessments = (await db.collection('programAssessments').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as ProgramAssessment);
const programsById = new Map(programs.map((p) => [p.id, p]));
if (!programs.length) {
  console.error('Run the seed first: npm run seed -- --emulator');
  process.exit(1);
}

const FIRST = ['Andrea', 'Miguel', 'Sofia', 'Joshua', 'Bea', 'Carlo', 'Isabel', 'Paolo', 'Nicole', 'Rafael', 'Trisha', 'Gabriel', 'Kyla', 'Marco', 'Jasmine', 'Luis', 'Angela', 'Enzo', 'Patricia', 'Daniel'];
const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Villanueva', 'Ramos', 'Aquino', 'Navarro', 'Castillo', 'Flores', 'Dela Cruz', 'Gonzales'];
const rand = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const some = <T,>(list: readonly T[], max: number) => [...list].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * max));

for (let i = 0; i < count; i += 1) {
  const name = `${rand(FIRST)} ${rand(LAST)}`;
  const email = `student${String(i + 1).padStart(3, '0')}@demo.wisepath.test`;
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, password: DEMO_STUDENT_PASSWORD, displayName: name }));
  const daysAgo = Math.floor(Math.random() * 56);
  const createdAt = Timestamp.fromMillis(Date.now() - (daysAgo + 2) * 86_400_000);
  const profile = {
    name,
    studentStatus: Math.random() < 0.75 ? 'incoming' : 'current',
    shsStrand: rand(SHS_STRANDS),
    academicAverage: String(80 + Math.floor(Math.random() * 18)),
    residenceType: Math.random() < 0.6 ? 'urban' : 'rural',
    parentalIncomeLevel: rand(PARENTAL_INCOME_OPTIONS).value,
    careerInterests: some(CAREER_INTEREST_OPTIONS, 3),
    learningGoals: some(LEARNING_GOALS_OPTIONS, 2),
    currentSkills: rand(SKILL_LEVEL_OPTIONS),
    learningStyle: rand(LEARNING_STYLE_OPTIONS),
    experience: 'No Experience',
  };
  const answers = Object.fromEntries(questions.map((q) => [q.id, rand(q.options).id]));
  const { rankings, dimensionScores, affordabilityConsidered } = rankPrograms({ programs, questions, answers, profile });
  const summary = summarizeRanking(rankings);
  const completedAt = Timestamp.fromMillis(Date.now() - daysAgo * 86_400_000 - Math.floor(Math.random() * 36e6));
  const resultRef = db.collection('careerResults').doc();

  await resultRef.set({
    userId: user.uid,
    studentSnapshot: {
      name,
      nameLower: toNameLower(name),
      email,
      studentStatus: profile.studentStatus,
      shsStrand: profile.shsStrand,
      academicAverage: profile.academicAverage,
      residenceType: profile.residenceType,
      careerInterests: profile.careerInterests,
      learningGoals: profile.learningGoals,
      learningStyle: profile.learningStyle,
      currentSkills: profile.currentSkills,
      experience: profile.experience,
      affordabilityConsidered,
    },
    answers: questions.map((q) => {
      const option = q.options.find((o) => o.id === answers[q.id])!;
      return { questionId: q.id, questionText: q.text, optionId: option.id, optionText: option.text, scope: q.scope, departmentId: q.departmentId };
    }),
    dimensionScores,
    rankings,
    ...summary,
    strengths: deriveStrengths(profile, rankings, programsById),
    guidanceSummary: buildGuidanceSummary(profile, summary.top3, dimensionScores),
    scoringVersion: 2,
    isLatest: true,
    completedAt,
  });

  const best = summary.top3[0];
  await db.doc(`users/${user.uid}`).set({
    email,
    role: 'student',
    status: 'active',
    displayName: name,
    nameLower: toNameLower(name),
    profileComplete: true,
    profile,
    activeProgramId: best.programId,
    hasCareerResult: true,
    hasPhoto: false,
    latestResult: {
      resultId: resultRef.id,
      bestProgramId: best.programId,
      bestProgramTitle: best.programTitle,
      bestDepartmentId: best.departmentId,
      topProgramIds: summary.topProgramIds,
      bestMatchPercent: best.matchPercent,
      completedAt,
    },
    createdAt,
    updatedAt: completedAt,
  });

  const assessment = assessments.find((a) => a.programId === best.programId);
  if (assessment && Math.random() < 0.8) {
    const attemptAnswers = Object.fromEntries(
      assessment.questions.map((q) => [q.id, (Math.random() < 0.6 ? q.options[0] : rand(q.options)).id]),
    );
    const score = scoreProgramAssessment(assessment, attemptAnswers);
    await db.collection('programAssessmentAttempts').add({
      userId: user.uid,
      studentName: name,
      studentEmail: email,
      programId: best.programId,
      programTitle: best.programTitle,
      departmentId: best.departmentId,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      assessmentVersion: assessment.version,
      answers: score.answers,
      scorePercent: score.scorePercent,
      passingPercent: assessment.passingPercent,
      isFit: score.isFit,
      completedAt: Timestamp.fromMillis(completedAt.toMillis() + 3_600_000),
    });
    await db.doc(`users/${user.uid}`).update({ hasFitAttempt: true });
  }

  if (profile.studentStatus === 'current') {
    const program = programsById.get(best.programId)!;
    const subjects = program.curriculum.flatMap((t) => t.subjects);
    const done = Math.floor(Math.random() * subjects.length);
    const subjectStatus = Object.fromEntries([
      ...subjects.slice(0, done).map((s) => [s.id, 'completed']),
      ...subjects.slice(done, done + 1).map((s) => [s.id, 'ongoing']),
    ]) as Record<string, 'completed' | 'ongoing'>;
    const progress = computeCurriculumProgress(program.curriculum, subjectStatus);
    await db.doc(`studentProgress/${progressDocId(user.uid, program.id)}`).set({
      userId: user.uid,
      programId: program.id,
      departmentId: program.departmentId,
      studentName: name,
      yearLevel: 1 + Math.min(3, Math.floor(done / 2)),
      semester: 1 + (done % 2),
      subjectStatus,
      completedUnits: progress.completedUnits,
      totalUnits: progress.totalUnits,
      percent: progress.percent,
      graduationReady: progress.graduationReady,
      updatedAt: Timestamp.now(),
    });
  }
  log.ok(`${name.padEnd(22)} → ${best.programTitle} (${best.matchPercent}%)`);
}

// One ready-to-use admin per department (emulator only), e.g. ccit.admin@demo.wisepath.test
log.title('Demo department admins');
for (const dept of (await db.collection('departments').get()).docs) {
  const code = String(dept.get('code'));
  if (dept.get('adminUid')) {
    log.info(`${code} already has an admin`);
    continue;
  }
  const email = `${code.toLowerCase()}.admin@demo.wisepath.test`;
  const name = `${code} Admin`;
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, password: EMULATOR_DEPT_ADMIN_PASSWORD, displayName: name }));
  const batch = db.batch();
  batch.set(db.doc(`users/${user.uid}`), {
    email,
    role: 'admin',
    status: 'active',
    displayName: name,
    nameLower: name.toLowerCase(),
    departmentId: dept.id,
    mustChangePassword: false,
    createdAt: Timestamp.now(),
    createdBy: 'demo-data',
    createdByName: 'Demo data',
    updatedAt: Timestamp.now(),
    updatedBy: 'demo-data',
  });
  batch.update(dept.ref, { adminUid: user.uid, adminName: name, adminEmail: email });
  await batch.commit();
  log.ok(email);
}

console.log(`\nDemo students and admins sign in with the passwords in scripts/src/fixtures.ts.`);
process.exit(0);
