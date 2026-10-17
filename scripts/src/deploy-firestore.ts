/**
 * Deploys firebase/firestore.rules and firebase/firestore.indexes.json with the service-account key
 * (works when the Firebase CLI account has no access to the project).
 *
 *   npm run deploy-firestore -w @wisepath/scripts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getApp } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { isEmulator, log, target } from './lib/admin';

if (isEmulator) {
  console.error('The emulator reads firestore.rules directly; nothing to deploy.');
  process.exit(1);
}

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const app = getApp();
const projectId = app.options.projectId!;
log.title(`Deploy Firestore rules + indexes → ${target()}`);

// ---------------------------------------------------------------- rules
const source = readFileSync(root('firebase/firestore.rules'), 'utf8');
const ruleset = await getSecurityRules(app).releaseFirestoreRulesetFromSource(source);
log.ok(`Rules released (${ruleset.name.split('/').pop()})`);

// ---------------------------------------------------------------- indexes
const token = (await app.options.credential!.getAccessToken()).access_token;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;
const api = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as Record<string, unknown> };
};

type IndexField = { fieldPath: string; order?: string; arrayConfig?: string };
const wanted = (JSON.parse(readFileSync(root('firebase/firestore.indexes.json'), 'utf8')) as {
  indexes: { collectionGroup: string; queryScope: string; fields: IndexField[] }[];
}).indexes;
const key = (fields: IndexField[]) => fields.map((f) => `${f.fieldPath}:${f.order ?? f.arrayConfig}`).join(',');

let created = 0;
let existing = 0;
let failed = 0;
const groups = [...new Set(wanted.map((i) => i.collectionGroup))];
for (const group of groups) {
  const current = await api(`${base}/${group}/indexes`);
  const have = new Set(
    ((current.body.indexes as { fields: IndexField[] }[] | undefined) ?? []).map((i) => key(i.fields.filter((f) => f.fieldPath !== '__name__'))),
  );
  for (const index of wanted.filter((i) => i.collectionGroup === group)) {
    if (have.has(key(index.fields))) {
      existing += 1;
      continue;
    }
    const res = await api(`${base}/${group}/indexes`, {
      method: 'POST',
      body: JSON.stringify({ queryScope: index.queryScope, fields: index.fields }),
    });
    if (res.ok || res.status === 409) created += 1;
    else {
      failed += 1;
      log.warn(`${group} [${key(index.fields)}]: ${res.status} ${(res.body.error as { message?: string })?.message ?? ''}`);
    }
  }
}
log.ok(`Indexes: ${created} requested, ${existing} already there${failed ? `, ${failed} failed` : ''} (they build in a few minutes)`);
process.exit(failed ? 1 : 0);
