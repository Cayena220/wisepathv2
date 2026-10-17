/**
 * Lists (or with --apply deletes) Firebase logins that have no users/{uid} doc and are older than 24 h.
 * These come from sign-ups attempted while registration was closed, or an interrupted admin creation.
 *
 *   npm run cleanup-orphans -w @wisepath/scripts [-- --emulator] [-- --apply]
 */
import { auth, db, isApply, log, target } from './lib/admin';

log.title(`Orphan logins → ${target()} ${isApply ? '(APPLY)' : '(dry run)'}`);
const cutoff = Date.now() - 24 * 3_600_000;
let pageToken: string | undefined;
const orphans: { uid: string; email?: string }[] = [];
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    if (new Date(user.metadata.creationTime).getTime() > cutoff) continue;
    if (!(await db.doc(`users/${user.uid}`).get()).exists) orphans.push({ uid: user.uid, email: user.email });
  }
  pageToken = page.pageToken;
} while (pageToken);

orphans.forEach((o) => log.info(`${o.email ?? '(no email)'}  ${o.uid}`));
if (isApply && orphans.length) {
  await auth.deleteUsers(orphans.map((o) => o.uid));
  log.ok(`Deleted ${orphans.length} orphan logins`);
} else {
  log.ok(`${orphans.length} orphan login(s) found${orphans.length ? ' — re-run with --apply to delete' : ''}`);
}
process.exit(0);
