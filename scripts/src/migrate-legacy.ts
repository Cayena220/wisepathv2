/**
 * Moves v1 data into the v2 model. Dry run by default; pass --apply to write.
 *
 *   npm run migrate [-- --emulator] [-- --apply] [-- --disable-auth]
 *
 * 1. v1 self-registered admins (role "admin", no department) → role "legacy_admin", disabled.
 *    --disable-auth also disables their Firebase login.
 * 2. Students: photo → userPhotos/{uid}; quizHistory / selectedPath / progress removed from the
 *    user doc; activeCourseId → activeProgramId; status, displayName and nameLower added.
 * 3. assessments → careerResults (same ids), with department fields and isLatest.
 *
 * The v1 collections are left untouched as a backup. Re-running skips work already done.
 */
import {
  computeDimensionScores,
  summarizeRanking,
  toNameLower,
  type RankedProgram,
} from '@wisepath/shared';
import { OPTION_IDS, SEED_CAREER_QUESTIONS, SEED_PROGRAMS } from '@wisepath/shared/seed';
import { auth, args, db, FieldValue, getSuperAdminUid, isApply, log, target, Timestamp, writeAudit } from './lib/admin';

log.title(`Migrate v1 data → ${target()} ${isApply ? '(APPLY)' : '(dry run — pass --apply to write)'}`);
const superAdminUid = await getSuperAdminUid();

const programSnap = await db.collection('programs').get();
const programs = new Map<string, { title: string; code: string; departmentId: string }>();
for (const p of SEED_PROGRAMS) programs.set(p.id, { title: p.title, code: p.code, departmentId: p.departmentId });
for (const d of programSnap.docs) {
  programs.set(d.id, { title: d.get('title'), code: d.get('code'), departmentId: d.get('departmentId') });
}
const questionsById = new Map(SEED_CAREER_QUESTIONS.map((q) => [q.id, q]));

const toTimestamp = (value: unknown): Timestamp | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? Timestamp.fromMillis(ms) : null;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') return Timestamp.fromDate((value as { toDate: () => Date }).toDate());
  if (typeof (value as { _seconds?: number })._seconds === 'number') return new Timestamp((value as { _seconds: number })._seconds, 0);
  return null;
};

const counts = { legacyAdmins: 0, students: 0, photos: 0, results: 0, resultsSkipped: 0 };
const writer = db.bulkWriter();
const write = (fn: () => unknown) => {
  if (isApply) fn();
};

// ---------------------------------------------------------------- users
const usersSnap = await db.collection('users').get();
const users = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

for (const userDoc of usersSnap.docs) {
  const data = userDoc.data();
  if (data.role === 'admin' && !data.departmentId) {
    counts.legacyAdmins += 1;
    log.info(`legacy admin ${data.email ?? userDoc.id} → legacy_admin (disabled)`);
    write(() =>
      writer.update(userDoc.ref, {
        role: 'legacy_admin',
        legacyRole: 'admin',
        status: 'disabled',
        migratedAt: FieldValue.serverTimestamp(),
      }),
    );
    if (isApply && args.flags.has('disable-auth')) await auth.updateUser(userDoc.id, { disabled: true }).catch(() => undefined);
    continue;
  }
  if (data.role !== 'student') continue;

  const profile = (data.profile ?? {}) as Record<string, unknown>;
  const name = (profile.name as string) || (data.displayName as string) || String(data.email ?? '').split('@')[0];
  const update: Record<string, unknown> = {};
  if (!data.status) update.status = 'active';
  if (!data.displayName) update.displayName = name;
  if (!data.nameLower) update.nameLower = toNameLower(name);
  if (data.activeCourseId && !data.activeProgramId) update.activeProgramId = data.activeCourseId;
  for (const key of ['quizHistory', 'selectedPath', 'progress', 'photoBase64']) {
    if (key in profile) update[`profile.${key}`] = FieldValue.delete();
  }
  const photo = profile.photoBase64 as string | undefined;
  if (photo) {
    if (photo.length <= 150_000) {
      counts.photos += 1;
      update.hasPhoto = true;
      write(() => writer.set(db.doc(`userPhotos/${userDoc.id}`), { dataUri: photo, updatedAt: FieldValue.serverTimestamp() }));
    } else {
      log.warn(`photo of ${data.email} is ${photo.length} chars (> 150 KB) — dropped; the student can upload a new one`);
      update.hasPhoto = false;
    }
  }
  if (Object.keys(update).length) {
    counts.students += 1;
    write(() => writer.update(userDoc.ref, { ...update, updatedAt: FieldValue.serverTimestamp() }));
  }
}

// ---------------------------------------------------------------- assessments → careerResults
const assessmentsSnap = await db.collection('assessments').get();
const latestByUser = new Map<string, { id: string; ms: number }>();
const converted: { id: string; userId: string; doc: Record<string, unknown>; summary: ReturnType<typeof summarizeRanking>; completedAt: Timestamp }[] = [];

for (const a of assessmentsSnap.docs) {
  const data = a.data();
  if ((await db.doc(`careerResults/${a.id}`).get()).exists) {
    counts.resultsSkipped += 1;
    continue;
  }
  const completedAt = toTimestamp(data.completedAt) ?? toTimestamp(data.savedAt) ?? Timestamp.now();

  const rankingSource: { courseId: string; score: number; matchPercent: number }[] = Array.isArray(data.courseRankings)
    ? data.courseRankings
    : (data.recommendedPaths ?? []).map((r: { courses?: { id: string }[]; matchPercent?: number }, i: number) => ({
        courseId: r.courses?.[0]?.id,
        score: 3 - i,
        matchPercent: r.matchPercent ?? 0,
      }));
  const rankings: RankedProgram[] = rankingSource
    .filter((row) => row.courseId && programs.has(row.courseId))
    .map((row) => {
      const p = programs.get(row.courseId)!;
      return {
        programId: row.courseId,
        programTitle: p.title,
        programCode: p.code,
        departmentId: p.departmentId,
        score: row.score ?? 0,
        matchPercent: row.matchPercent ?? 0,
      };
    });
  if (!rankings.length) {
    log.warn(`assessment ${a.id} has no recognisable programs — skipped`);
    counts.resultsSkipped += 1;
    continue;
  }

  const answers = Object.entries((data.quizAnswers ?? {}) as Record<string, string>)
    .map(([questionId, index]) => {
      const question = questionsById.get(questionId);
      const optionId = OPTION_IDS[Number.parseInt(index, 10)];
      const option = question?.options.find((o) => o.id === optionId);
      return question && option
        ? { questionId, questionText: question.text, optionId, optionText: option.text, scope: 'system', departmentId: null }
        : null;
    })
    .filter(Boolean) as { questionId: string; optionId: string }[];

  const user = users.get(data.userId) ?? {};
  const profile = (user.profile ?? {}) as Record<string, unknown>;
  const name = (profile.name as string) || (user.displayName as string) || String(user.email ?? '');
  const summary = summarizeRanking(rankings);

  converted.push({
    id: a.id,
    userId: data.userId,
    completedAt,
    summary,
    doc: {
      userId: data.userId,
      studentSnapshot: {
        name,
        nameLower: toNameLower(name),
        email: user.email ?? '',
        studentStatus: profile.studentStatus ?? '',
        shsStrand: profile.shsStrand ?? profile.seniorHighStrand ?? '',
        academicAverage: profile.academicAverage ?? '',
        residenceType: profile.residenceType ?? '',
        careerInterests: profile.careerInterests ?? [],
        learningGoals: Array.isArray(profile.learningGoals) ? profile.learningGoals : [],
        learningStyle: profile.learningStyle ?? '',
        currentSkills: profile.currentSkills ?? '',
        experience: profile.experience ?? '',
        affordabilityConsidered: Boolean(profile.parentalIncomeLevel) && profile.parentalIncomeLevel !== 'prefer_not_to_say',
      },
      answers,
      dimensionScores: computeDimensionScores(SEED_CAREER_QUESTIONS, Object.fromEntries(answers.map((x) => [x.questionId, x.optionId]))),
      rankings,
      ...summary,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      guidanceSummary: '',
      scoringVersion: 1,
      completedAt,
      migratedFrom: 'assessments',
    },
  });
  const prev = latestByUser.get(data.userId);
  if (!prev || completedAt.toMillis() > prev.ms) latestByUser.set(data.userId, { id: a.id, ms: completedAt.toMillis() });
}

for (const item of converted) {
  const isLatest = latestByUser.get(item.userId)?.id === item.id;
  counts.results += 1;
  write(() => writer.set(db.doc(`careerResults/${item.id}`), { ...item.doc, isLatest }));
  if (isLatest && users.has(item.userId)) {
    const best = item.summary.top3[0];
    write(() =>
      writer.update(db.doc(`users/${item.userId}`), {
        hasCareerResult: true,
        latestResult: {
          resultId: item.id,
          bestProgramId: best.programId,
          bestProgramTitle: best.programTitle,
          bestDepartmentId: best.departmentId,
          topProgramIds: item.summary.topProgramIds,
          bestMatchPercent: best.matchPercent,
          completedAt: item.completedAt,
        },
      }),
    );
  }
}

if (isApply) {
  await writer.close();
  await writeAudit({
    actorUid: superAdminUid,
    actorName: 'Migration script',
    action: 'system.migrate',
    targetType: 'system',
    targetId: 'v1',
    targetLabel: 'Migrated v1 data',
    details: counts,
  });
}

log.ok(`legacy admins retired:   ${counts.legacyAdmins}`);
log.ok(`student docs updated:    ${counts.students} (photos moved: ${counts.photos})`);
log.ok(`career results created:  ${counts.results} (skipped: ${counts.resultsSkipped})`);
console.log(isApply ? '\nMigration applied.' : '\nDry run only. Re-run with --apply to write these changes.');
process.exit(0);
