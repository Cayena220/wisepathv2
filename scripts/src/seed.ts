/**
 * Seeds the 7 departments, 21 programs, 6 system career questions and 3 program assessments.
 *
 *   npm run seed [-- --emulator] [-- --force-ids it,hospitality]
 *
 * Create-only and idempotent: existing docs are never overwritten (admin edits are safe), and ids
 * recorded in settings/system.seededIds are never re-created after an admin deletes them.
 */
import {
  SEED_CAREER_QUESTIONS,
  SEED_DEPARTMENTS,
  SEED_PROGRAM_ASSESSMENTS,
  SEED_PROGRAMS,
} from '@wisepath/shared/seed';
import { args, db, FieldValue, getSuperAdminUid, log, target, writeAudit } from './lib/admin';

log.title(`Seed WisePath catalog → ${target()}`);

const superAdminUid = await getSuperAdminUid();
const superAdmin = await db.doc(`users/${superAdminUid}`).get();
const superAdminName = (superAdmin.get('displayName') as string) || 'Super Admin';
const forceIds = new Set((args.values['force-ids'] ?? '').split(',').filter(Boolean));

const system = await db.doc('settings/system').get();
const seeded: Record<string, string[]> = system.get('seededIds') ?? {};

const stamps = () => ({
  createdAt: FieldValue.serverTimestamp(),
  createdBy: superAdminUid,
  createdByName: 'System (seed)',
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: superAdminUid,
  updatedByName: 'System (seed)',
});

const summary: Record<string, { created: number; skipped: number; tombstoned: number }> = {};

const seedCollection = async <T extends { id: string }>(
  collection: string,
  key: string,
  items: T[],
  toDoc: (item: T) => Record<string, unknown>,
) => {
  const stats = { created: 0, skipped: 0, tombstoned: 0 };
  const known = new Set(seeded[key] ?? []);
  const batch = db.batch();
  for (const item of items) {
    const ref = db.collection(collection).doc(item.id);
    const exists = (await ref.get()).exists;
    if (exists && !forceIds.has(item.id)) {
      stats.skipped += 1;
      continue;
    }
    if (!exists && known.has(item.id) && !forceIds.has(item.id)) {
      stats.tombstoned += 1; // deleted by an admin after an earlier seed — do not resurrect
      continue;
    }
    batch.set(ref, { ...toDoc(item), ...stamps() });
    known.add(item.id);
    stats.created += 1;
  }
  await batch.commit();
  seeded[key] = [...known];
  summary[collection] = stats;
};

await seedCollection('departments', 'departments', SEED_DEPARTMENTS, ({ id: _id, ...rest }) => ({
  ...rest,
  status: 'active',
  adminUid: null,
  adminName: null,
  adminEmail: null,
}));

await seedCollection('programs', 'programs', SEED_PROGRAMS, ({ id: _id, ...rest }) => rest);
await seedCollection('careerQuestions', 'careerQuestions', SEED_CAREER_QUESTIONS, ({ id: _id, ...rest }) => rest);
await seedCollection('programAssessments', 'programAssessments', SEED_PROGRAM_ASSESSMENTS, ({ id: _id, ...rest }) => rest);

await db.doc('settings/system').set({ seededIds: seeded }, { merge: true });
await db.doc('settings/catalog').set({ updatedAt: FieldValue.serverTimestamp(), updatedBy: superAdminUid }, { merge: true });

const created = Object.values(summary).reduce((sum, s) => sum + s.created, 0);
if (created > 0) {
  await writeAudit({
    actorUid: superAdminUid,
    actorName: superAdminName,
    action: 'system.seed',
    targetType: 'system',
    targetId: 'catalog',
    targetLabel: 'Seeded catalog',
    details: summary,
  });
}

for (const [collection, stats] of Object.entries(summary)) {
  log.ok(`${collection.padEnd(20)} created ${stats.created}, kept ${stats.skipped}, skipped deleted ${stats.tombstoned}`);
}
console.log(created ? '\nDone.' : '\nNothing to do — the catalog is already seeded.');
process.exit(0);
