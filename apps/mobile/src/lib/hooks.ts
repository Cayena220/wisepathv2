import { onSnapshot, type DocumentData, type DocumentReference, type Query } from 'firebase/firestore';
import * as React from 'react';

export interface Live<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
}

const withId = <T,>(snap: { id: string; data: () => DocumentData | undefined }) => ({ id: snap.id, ...snap.data() }) as T;

/** Live Firestore query; `key` must change whenever the query changes. Pass null to skip. */
export function useLiveQuery<T>(q: Query | null, key: string): Live<T[]> {
  const [state, setState] = React.useState<Live<T[]>>({ data: undefined, error: null, loading: Boolean(q) });
  React.useEffect(() => {
    if (!q) {
      setState({ data: undefined, error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => withId<T>(d)), error: null, loading: false }),
      (error) => setState({ data: undefined, error, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Live Firestore document (null when missing). */
export function useLiveDoc<T>(ref: DocumentReference | null, key: string): Live<T | null> {
  const [state, setState] = React.useState<Live<T | null>>({ data: undefined, error: null, loading: Boolean(ref) });
  React.useEffect(() => {
    if (!ref) {
      setState({ data: undefined, error: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? withId<T>(snap) : null, error: null, loading: false }),
      (error) => setState({ data: undefined, error, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** Re-render every `ms` (for countdowns). */
export function useNow(ms = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

export const errorText = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'That email already has a WisePath account. Try signing in.',
    'auth/weak-password': 'Use at least 6 characters for your password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/requires-recent-login': 'Please sign in again, then retry.',
    'permission-denied': 'You do not have permission to do that.',
    unavailable: 'Cannot reach WisePath right now. Check your connection.',
  };
  if (map[code]) return map[code];
  const message = (error as { message?: string })?.message;
  return message ? message.replace(/^Firebase: /, '').replace(/\s*\(.*\)\.?$/, '') : 'Something went wrong. Please try again.';
};
