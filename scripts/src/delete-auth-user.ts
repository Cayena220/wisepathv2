/**
 * Deletes one Firebase login so its email can be reused (e.g. a replaced admin).
 * Firestore docs are kept for the audit trail.
 *
 *   npm run delete-auth-user -w @wisepath/scripts -- --email old.admin@school.edu [--apply]
 */
import { args, auth, db, isApply, log, target } from './lib/admin';

const email = args.values.email?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run delete-auth-user -w @wisepath/scripts -- --email someone@school.edu [--apply]');
  process.exit(1);
}
log.title(`Delete login ${email} → ${target()} ${isApply ? '(APPLY)' : '(dry run)'}`);
const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  log.warn('No login with that email.');
  process.exit(0);
}
const docSnap = await db.doc(`users/${user.uid}`).get();
const system = await db.doc('settings/system').get();
if (system.get('superAdminUid') === user.uid) {
  console.error('That is the Super Admin. Transfer the role first (bootstrap --transfer).');
  process.exit(1);
}
if (docSnap.get('status') === 'active' && docSnap.get('role') === 'admin') {
  console.error('That admin is still active. Disable them on the website first.');
  process.exit(1);
}
log.info(`uid ${user.uid}, role ${docSnap.get('role') ?? '(no doc)'}, status ${docSnap.get('status') ?? '—'}`);
if (isApply) {
  await auth.deleteUser(user.uid);
  log.ok('Login deleted. The users doc stays for the audit trail.');
} else {
  log.ok('Dry run — re-run with --apply to delete the login.');
}
process.exit(0);
