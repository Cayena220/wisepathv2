import type { Department, UserDoc } from '@wisepath/shared';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import * as React from 'react';
import { auth, db } from '@/lib/firebase';
import { withId } from '@/lib/utils';

export type AuthStatus =
  | 'loading'
  | 'signedOut'
  | 'noAccount' // signed in but no staff account
  | 'student' // students use the Android app
  | 'disabled' // admin disabled or removed from their department
  | 'mustChangePassword'
  | 'ready';

export type StaffRole = 'superadmin' | 'admin';

export interface Actor {
  uid: string;
  name: string;
  email: string;
  role: StaffRole;
  departmentId: string | null;
}

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  account: UserDoc | null;
  department: Department | null;
  role: StaffRole | null;
  isSuperAdmin: boolean;
  actor: Actor | null;
  notice: string | null;
  clearNotice: () => void;
  signOut: (notice?: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [superClaim, setSuperClaim] = React.useState(false);
  const [account, setAccount] = React.useState<UserDoc | null | undefined>(undefined);
  const [department, setDepartment] = React.useState<Department | null | undefined>(undefined);
  const [notice, setNotice] = React.useState<string | null>(null);
  const stampedLogin = React.useRef<string | null>(null);

  const signOut = React.useCallback(async (message?: string) => {
    if (message) setNotice(message);
    await firebaseSignOut(auth);
  }, []);

  // Firebase session + custom claims
  React.useEffect(
    () =>
      onAuthStateChanged(auth, async (next) => {
        setAccount(undefined);
        setDepartment(undefined);
        if (next) {
          const token = await next.getIdTokenResult();
          setSuperClaim(token.claims.superadmin === true);
        } else {
          setSuperClaim(false);
          stampedLogin.current = null;
        }
        setUser(next);
        setAuthReady(true);
      }),
    [],
  );

  // Live users/{uid} — a Super Admin disabling an admin takes effect immediately
  React.useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => setAccount(snap.exists() ? withId<UserDoc>(snap) : null),
      () => setAccount(null),
    );
  }, [user]);

  // Live department doc for admins — losing the slot also revokes access
  const departmentId = account?.role === 'admin' ? account.departmentId ?? null : null;
  React.useEffect(() => {
    if (!departmentId) {
      setDepartment(null);
      return;
    }
    return onSnapshot(
      doc(db, 'departments', departmentId),
      (snap) => setDepartment(snap.exists() ? withId<Department>(snap) : null),
      () => setDepartment(null),
    );
  }, [departmentId]);

  const status: AuthStatus = React.useMemo(() => {
    if (!authReady) return 'loading';
    if (!user) return 'signedOut';
    if (account === undefined) return 'loading';
    if (!account) return 'noAccount';
    if (account.role === 'student') return 'student';
    if (account.role === 'superadmin') {
      if (!superClaim) return 'noAccount';
      return account.mustChangePassword ? 'mustChangePassword' : 'ready';
    }
    if (account.role === 'admin') {
      if (account.status !== 'active') return 'disabled';
      if (department === undefined) return 'loading';
      if (!department || department.adminUid !== user.uid || department.status !== 'active') return 'disabled';
      return account.mustChangePassword ? 'mustChangePassword' : 'ready';
    }
    return 'disabled';
  }, [authReady, user, account, superClaim, department]);

  // A disabled admin is signed out right away (even mid-session).
  React.useEffect(() => {
    if (status === 'disabled') {
      void signOut('Your admin access has been turned off by the Super Admin. Contact them if you think this is a mistake.');
    }
  }, [status, signOut]);

  // Record the sign-in once per session.
  React.useEffect(() => {
    if (!user || (status !== 'ready' && status !== 'mustChangePassword')) return;
    if (stampedLogin.current === user.uid) return;
    stampedLogin.current = user.uid;
    void updateDoc(doc(db, 'users', user.uid), { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(() => undefined);
  }, [user, status]);

  const role: StaffRole | null =
    account?.role === 'superadmin' && superClaim ? 'superadmin' : account?.role === 'admin' ? 'admin' : null;

  const actor: Actor | null =
    user && account && role
      ? {
          uid: user.uid,
          name: account.displayName || user.email || 'Staff',
          email: account.email || user.email || '',
          role,
          departmentId: role === 'admin' ? account.departmentId ?? null : null,
        }
      : null;

  const value: AuthValue = {
    status,
    user,
    account: account ?? null,
    department: department ?? null,
    role,
    isSuperAdmin: role === 'superadmin',
    actor,
    notice,
    clearNotice: () => setNotice(null),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Actor for pages behind the guards (always signed in and ready). */
export function useActor(): Actor {
  const { actor } = useAuth();
  if (!actor) throw new Error('useActor used outside a signed-in route');
  return actor;
}
