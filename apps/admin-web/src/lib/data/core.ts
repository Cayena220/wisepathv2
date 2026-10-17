import type { AuditAction, AuditTargetType } from '@wisepath/shared';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  type DocumentReference,
  type Query,
  type WriteBatch,
} from 'firebase/firestore';
import * as React from 'react';
import type { Actor } from '@/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { withId } from '@/lib/utils';

export const createStamps = (actor: Actor) => ({
  createdAt: serverTimestamp(),
  createdBy: actor.uid,
  createdByName: actor.name,
  updatedAt: serverTimestamp(),
  updatedBy: actor.uid,
  updatedByName: actor.name,
});

export const updateStamps = (actor: Actor) => ({
  updatedAt: serverTimestamp(),
  updatedBy: actor.uid,
  updatedByName: actor.name,
});

export interface AuditInput {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  departmentId?: string | null;
  details?: Record<string, unknown>;
}

/** Adds an append-only audit entry to a batch. */
export const addAudit = (batch: WriteBatch, actor: Actor, input: AuditInput) => {
  batch.set(doc(collection(db, 'auditLogs')), {
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    departmentId: input.departmentId ?? actor.departmentId ?? null,
    details: input.details ?? {},
    createdAt: serverTimestamp(),
  });
};

/** Tells the Android app to refresh its cached catalog. */
export const bumpCatalog = (batch: WriteBatch, actor: Actor) => {
  batch.update(doc(db, 'settings', 'catalog'), { updatedAt: serverTimestamp(), updatedBy: actor.uid });
};

export interface LiveState<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
}

/** Live collection (onSnapshot). Pass null to skip. `deps` must change when the query changes. */
export function useLiveQuery<T>(q: Query | null, deps: readonly unknown[]): LiveState<T[]> {
  const [state, setState] = React.useState<LiveState<T[]>>({ data: undefined, error: null, isLoading: Boolean(q) });
  React.useEffect(() => {
    if (!q) {
      setState({ data: undefined, error: null, isLoading: false });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => withId<T>(d)), error: null, isLoading: false }),
      (error) => setState({ data: undefined, error, isLoading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Live single document (onSnapshot). Resolves to null when the doc does not exist. */
export function useLiveDoc<T>(ref: DocumentReference | null, deps: readonly unknown[]): LiveState<T | null> {
  const [state, setState] = React.useState<LiveState<T | null>>({ data: undefined, error: null, isLoading: Boolean(ref) });
  React.useEffect(() => {
    if (!ref) {
      setState({ data: undefined, error: null, isLoading: false });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true }));
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? withId<T>(snap) : null, error: null, isLoading: false }),
      (error) => setState({ data: undefined, error, isLoading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
