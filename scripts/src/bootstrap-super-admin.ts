/**
 * Creates (or re-confirms) THE one Super Admin.
 *
 *   npm run bootstrap:superadmin -- --email you@school.edu --name "Your Name" [--emulator]
 *   npm run bootstrap:superadmin -- --email new@school.edu --name "New Person" --transfer
 *
 * Sets the custom claim { superadmin: true }, which only the Admin SDK can do, so no
 * client can make itself Super Admin. Also creates the settings docs the apps need.
 * Safe to re-run with the same email.
 */
import { toNameLower } from '@wisepath/shared';
import { args, auth, db, FieldValue, generatePassword, isEmulator, log, target, writeAudit } from './lib/admin';

const email = args.values.email?.trim().toLowerCase();
const name = args.values.name?.trim();
const providedPassword = args.values.password;

if (!email || !name) {
  console.error('Usage: npm run bootstrap:superadmin -- --email you@school.edu --name "Your Name" [--emulator] [--transfer]');
  process.exit(1);
}

log.title(`Bootstrap Super Admin → ${target()}`);

const systemRef = db.doc('settings/system');
const system = await systemRef.get();
const existingUid = system.get('superAdminUid') as string | undefined;

let user = await auth.getUserByEmail(email).catch(() => null);

if (existingUid && existingUid !== user?.uid) {
  if (!args.flags.has('transfer')) {
    const current = await auth.getUser(existingUid).catch(() => null);
    console.error(
      `A Super Admin already exists (${current?.email ?? existingUid}). There can only be one.\n` +
        `To hand the role to ${email}, re-run with --transfer.`,
    );
    process.exit(1);
  }
  log.warn(`Transferring Super Admin from ${existingUid} to ${email}`);
  await auth.setCustomUserClaims(existingUid, {}).catch(() => undefined);
  await auth.revokeRefreshTokens(existingUid).catch(() => undefined);
  await db.doc(`users/${existingUid}`).set(
    { role: 'legacy_admin', status: 'disabled', updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

let generated: string | null = null;
if (!user) {
  generated = providedPassword ? null : generatePassword();
  user = await auth.createUser({
    email,
    password: providedPassword ?? generated!,
    displayName: name,
    emailVerified: true,
  });
  log.ok(`Created login ${email}`);
} else {
  log.info(`Login ${email} already exists (${user.uid})`);
}

await auth.setCustomUserClaims(user.uid, { superadmin: true });
await auth.revokeRefreshTokens(user.uid);
log.ok('Set custom claim { superadmin: true } (takes effect at next sign-in)');

const userRef = db.doc(`users/${user.uid}`);
const userSnap = await userRef.get();
await userRef.set(
  {
    email,
    role: 'superadmin',
    status: 'active',
    displayName: name,
    nameLower: toNameLower(name),
    ...(userSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    ...(generated ? { mustChangePassword: true } : userSnap.exists ? {} : { mustChangePassword: false }),
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

await systemRef.set(
  {
    superAdminUid: user.uid,
    schemaVersion: 2,
    bootstrappedAt: system.get('bootstrappedAt') ?? FieldValue.serverTimestamp(),
    seededIds: system.get('seededIds') ?? { departments: [], programs: [], careerQuestions: [], programAssessments: [] },
  },
  { merge: true },
);

const ensure = async (path: string, data: Record<string, unknown>) => {
  const ref = db.doc(path);
  if ((await ref.get()).exists) return log.info(`${path} already exists`);
  await ref.set(data);
  log.ok(`Created ${path}`);
};

await ensure('settings/registration', {
  enabled: true,
  opensAt: null,
  closesAt: null,
  closedMessage: null,
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: user.uid,
  updatedByName: name,
});
await ensure('settings/catalog', { updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
await ensure('settings/app', { maxDeptCareerQuestions: 3, updatedAt: FieldValue.serverTimestamp() });

await writeAudit({
  actorUid: user.uid,
  actorName: name,
  action: 'system.bootstrap',
  targetType: 'system',
  targetId: user.uid,
  targetLabel: `Super Admin ${email}`,
});

console.log(`\nSuper Admin ready: ${name} <${email}>`);
if (generated) {
  console.log(`\nTemporary password (shown once — you will be asked to change it at first sign-in):\n\n    ${generated}\n`);
} else if (providedPassword) {
  console.log('Password: the one you passed with --password.');
}
if (isEmulator) console.log('Running against the emulator — nothing in production was touched.');
process.exit(0);
