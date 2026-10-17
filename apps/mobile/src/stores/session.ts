import type { UserDoc } from '@wisepath/shared';
import type { User } from 'firebase/auth';
import { create } from 'zustand';

interface SessionState {
  user: User | null;
  /** undefined = still loading, null = signed in but no users doc */
  account: UserDoc | null | undefined;
  authReady: boolean;
  /** True while Register is creating the login + users doc, so the root navigator waits. */
  registering: boolean;
  setUser: (user: User | null) => void;
  setAccount: (account: UserDoc | null | undefined) => void;
  setRegistering: (value: boolean) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  account: undefined,
  authReady: false,
  registering: false,
  setUser: (user) => set({ user, authReady: true, account: user ? undefined : null }),
  setAccount: (account) => set({ account }),
  setRegistering: (registering) => set({ registering }),
}));

/** The signed-in student (screens behind the root gate can rely on it). */
export const useStudent = () => {
  const user = useSession((s) => s.user);
  const account = useSession((s) => s.account);
  return { uid: user?.uid ?? '', email: user?.email ?? account?.email ?? '', account: account ?? null };
};
