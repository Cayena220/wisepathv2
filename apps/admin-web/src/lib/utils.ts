import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Snapshot → typed object with its id. */
export const withId = <T>(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T =>
  ({ id: snap.id, ...snap.data() }) as T;

/** Friendly message for Firebase errors shown in toasts and forms. */
export const errorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/email-already-in-use': 'That email already has a WisePath login.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'That password is too weak.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/requires-recent-login': 'Please sign in again, then retry.',
    'permission-denied': 'You do not have permission to do that.',
    'failed-precondition': 'This needs a database index that is still being built. Try again in a few minutes.',
    unavailable: 'The database is unreachable. Check your connection.',
  };
  if (map[code]) return map[code];
  const message = (error as { message?: string })?.message;
  return message ? message.replace(/^Firebase: /, '').replace(/\s*\(.*\)\.?$/, '') : 'Something went wrong.';
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
