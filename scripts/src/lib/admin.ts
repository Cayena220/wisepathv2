import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

export const EXPECTED_PROJECT = 'wisepath-v2';
export const EMULATOR_PROJECT = 'demo-wisepath';

export interface Args {
  flags: Set<string>;
  values: Record<string, string>;
}

/** --flag and --key value / --key=value */
export const parseArgs = (argv = process.argv.slice(2)): Args => {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    if (inline !== undefined) values[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) values[key] = argv[++i];
    else flags.add(key);
  }
  return { flags, values };
};

export const args = parseArgs();
export const isEmulator = args.flags.has('emulator');
export const isApply = args.flags.has('apply');

const secretPath = fileURLToPath(new URL('../../.secrets/service-account.json', import.meta.url));

let app: App;
if (isEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  app = initializeApp({ projectId: EMULATOR_PROJECT });
} else {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || secretPath;
  if (!existsSync(keyFile)) {
    console.error(
      `\nNo service-account key found.\n` +
        `Download one from Firebase Console → Project settings → Service accounts → Generate new private key,\n` +
        `save it as scripts/.secrets/service-account.json (it is git-ignored), or pass --emulator.\n`,
    );
    process.exit(1);
  }
  const key = JSON.parse(readFileSync(keyFile, 'utf8')) as { project_id: string };
  if (key.project_id !== EXPECTED_PROJECT && !args.flags.has('any-project')) {
    console.error(`Refusing to run against "${key.project_id}". Expected "${EXPECTED_PROJECT}" (pass --any-project to override).`);
    process.exit(1);
  }
  app = initializeApp({ credential: cert(keyFile as never), projectId: key.project_id });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export { FieldValue, Timestamp };

export const target = () => (isEmulator ? `emulator (${EMULATOR_PROJECT})` : `production (${EXPECTED_PROJECT})`);

export const log = {
  info: (msg: string) => console.log(`  ${msg}`),
  ok: (msg: string) => console.log(`✔ ${msg}`),
  warn: (msg: string) => console.log(`! ${msg}`),
  title: (msg: string) => console.log(`\n${msg}\n${'─'.repeat(Math.min(msg.length, 72))}`),
};

/** Random password with upper, lower, digit and symbol, no look-alike characters. */
export const generatePassword = (length = 16) => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*?-'];
  const all = sets.join('');
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  const chars = sets.map((set, i) => set[bytes[i] % set.length]);
  for (let i = sets.length; i < length; i += 1) chars.push(all[bytes[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

export const getSuperAdminUid = async (): Promise<string> => {
  const snap = await db.doc('settings/system').get();
  const uid = snap.get('superAdminUid') as string | undefined;
  if (!uid) {
    console.error('No Super Admin yet. Run `npm run bootstrap:superadmin -- --email you@school.edu --name "Your Name"` first.');
    process.exit(1);
  }
  return uid;
};

export const writeAudit = (entry: {
  actorUid: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  details?: Record<string, unknown>;
}) =>
  db.collection('auditLogs').add({
    actorRole: 'system',
    departmentId: null,
    details: {},
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
