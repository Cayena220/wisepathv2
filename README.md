# WisePath 2.0

Course recommendation and academic progress system for incoming college students — STI West Negros University capstone (College of Information and Communications Technology).

| Part | Who uses it | Folder |
|---|---|---|
| **Android app** | Students | `apps/mobile` (Expo SDK 57) |
| **Admin website** | One **Super Admin** + one **Admin per department** | `apps/admin-web` (Vite + React) |
| Shared code | Scoring engine, types, seed catalog, brand | `packages/shared` |
| Security rules | Firestore rules, indexes, rules tests | `firebase/` |
| Admin scripts | Super Admin bootstrap, seed, migration | `scripts/` |

Backend: Firebase **Spark (free) plan** — Authentication + Cloud Firestore + Hosting. No Cloud Functions are needed.

---

## What changed from v1

- **Admin side is now a full website** with two roles: one **Super Admin** and **one Admin per department**. Students use the **Android app** only.
- **Super Admin** creates the departments, creates each department's admin with a **one-time password**, disables/re-enables/replaces admins, and controls **student registration** (switch it off, or schedule it to close after enrollment). The registration lock is enforced by Firestore rules using the **server clock**, so it can't be bypassed from a phone.
- **One admin per department** — each department has a single admin slot. A second admin for the same department is rejected by the database rules.
- **Only the owning admin can edit or delete** a department's programs, program assessments and department career questions. Other admins (and the Super Admin) can only view them.
- **Results are clickable everywhere** — dashboard numbers, "Course results" bars, charts, activity, result lists and student pages all open the detail behind them.
- **Background** — a designed WisePath background (route + compass motif) on the website and in the app.
- Fixed v1 bugs: program assessments were unreachable and always scored 0%; the Progress screen was unreachable; anyone could make themselves admin; deleted courses came back; admin records showed raw IDs.

---

## Quick start (local, with the Firebase emulators — no real data touched)

Requirements: Node 22+ (24 recommended), Java 11+ (for the emulators).

```bash
npm install
```

```bash
npm run emulators
```

In a second terminal, create the test Super Admin, the catalog and demo students:

```bash
npm run bootstrap:superadmin -- --emulator --email superadmin@demo.wisepath.test --name "Demo Super Admin" --password Demo-SuperAdmin-2026
```

```bash
npm run seed -- --emulator
```

```bash
npm run demo -- --emulator --students 40
```

Then start the website against the emulators and open http://localhost:5173:

```bash
npm run dev:emulator
```

To run the Android app against the same emulators, set `EXPO_PUBLIC_USE_EMULATORS=true` (and `EXPO_PUBLIC_EMULATOR_HOST=10.0.2.2` for the Android emulator, or your PC's LAN IP for a real phone), then:

```bash
npm run mobile
```

Test logins (emulator only) are listed in `scripts/src/fixtures.ts`. Emulator UI: http://127.0.0.1:4000.

---

## Production setup (Firebase project `wisepath-v2`)

1. **Config files**
   - `apps/admin-web/.env.local` — copy from `.env.example` (Web app config, `VITE_FIREBASE_*`).
   - `apps/mobile/.env` — copy from `.env.example` (`EXPO_PUBLIC_FIREBASE_*`).
   - `scripts/.secrets/service-account.json` — Firebase Console → Project settings → Service accounts → *Generate new private key*. **Never commit it** (it is git-ignored).
2. **Deploy indexes first** (they take a few minutes to build). If the CLI offers to delete indexes that aren't in the file, answer **No**.
   ```bash
   npx firebase deploy --only firestore:indexes
   ```
3. **Create the one Super Admin** (prints a one-time password if you don't pass `--password`):
   ```bash
   npm run bootstrap:superadmin -- --email you@school.edu --name "Your Name"
   ```
4. **Seed the catalog** (7 departments, 21 programs, 6 core questions, 3 fit checks):
   ```bash
   npm run seed
   ```
5. **Migrate v1 data** — dry run first, read the summary, then apply:
   ```bash
   npm run migrate
   ```
   ```bash
   npm run migrate -- --apply
   ```
6. **Deploy rules + website** in the same window you release the new APK (the old v1 APK stops working once the new rules are live):
   ```bash
   npm run deploy:rules
   ```
   ```bash
   npm run deploy:web
   ```
7. Sign in to the website as Super Admin → **Admins → Create admin** for each department → give each admin their one-time password privately.
8. **Build the Android APK** (EAS cloud build is recommended on Windows):
   ```bash
   cd apps/mobile && npx eas build -p android --profile preview
   ```
   `versionCode` is 3 and the same keystore is used, so it installs over the v1 APK.

---

## How the roles work

| | Super Admin | Department Admin | Student (Android) |
|---|---|---|---|
| How the account is made | `bootstrap-super-admin` script (custom claim) | Created by the Super Admin, one-time password | Self-registers while registration is open |
| Departments | Create, rename, archive | View | — |
| Admins | Create, disable, re-enable, reset password | — | — |
| Registration window | Open/close now, schedule open/close | — | Blocked when closed |
| Programs, fit checks | View all | Create/edit/archive/delete **own department only** | Browse, take fit checks |
| Career questions | Edit the 6 core questions | Up to 3 for own department | Answer |
| Results | All students | Students whose top-3 includes their programs | Own results |
| Audit log | Everything | Own department | — |

### One-time passwords
The website creates the admin's login with a throw-away secondary Firebase app (so the Super Admin stays signed in), then claims the department slot in the same database batch. The password is shown **once** and never stored. At first sign-in the admin must set their own password; until then the rules block all their access.

### Disabling an admin
Disabling frees the department slot and signs them out immediately. On the Spark plan the login itself still exists but can't access anything. To free the email for reuse:
```bash
npm run delete-auth-user -w @wisepath/scripts -- --email old.admin@school.edu --apply
```

### Registration lock
Settings live in `settings/registration` (`enabled`, `opensAt`, `closesAt`, message). Firestore rules only allow a new student account while `enabled` and `opensAt ≤ server time < closesAt`. Existing students can always sign in.

---

## Recommendation engine
`packages/shared/src/scoring/careerEngine.ts` — same formula as v1, now data-driven so admin-created programs rank too:

```
score = Σ(answer dimension points × program affinity) + 3 per answer tagged to the program
      + profile signals × 0.85 + affordability bonus
match % = score ÷ (sum of the top-3 scores) × 100
```
Each program stores its own `dimensionAffinity` and `matchSignals` (edited on the website's program form). A parity test runs 500 random students through both the v1 engine and v2 to prove the results match.

---

## Verification

```bash
npm run typecheck
```
```bash
npm test
```
```bash
npm run test:rules
```
```bash
cd apps/mobile && npx expo export --platform android
```

- `npm test` — scoring parity with v1, registration window edges, program-fit scoring.
- `npm run test:rules` — 31 security-rule tests (registration window, role escalation, one admin per department, ownership, result scoping, audit log immutability).

## Spark plan limits
50K reads / 20K writes per day. The app caches the catalog (1 read per launch unless an admin changed something), dashboards use `count()` queries, and lists are paginated.

## Project team
De Leon, Sweet Angelu P. · Esguerra, Shanela C. · Galilea, Shan Mark G. · Jorolan, Jeia A. · Clauor, Josh Matthew E.
