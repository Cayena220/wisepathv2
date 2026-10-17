import type { FireTimestamp } from '../types';

export type TimeLike = FireTimestamp | Date | number | null | undefined;

export const toMillis = (value: TimeLike): number | null => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as FireTimestamp).toMillis === 'function') return (value as FireTimestamp).toMillis();
  return null;
};

export type RegistrationState = 'open' | 'closed' | 'scheduled' | 'ended';

export interface RegistrationStatus {
  state: RegistrationState;
  isOpen: boolean;
  opensAt: number | null;
  closesAt: number | null;
  /** When the state will next change on its own (scheduled → open, open → ended), else null. */
  nextChangeAt: number | null;
  label: string;
}

export interface RegistrationWindow {
  enabled: boolean;
  opensAt?: TimeLike;
  closesAt?: TimeLike;
}

/**
 * Same semantics as firestore.rules registrationOpen():
 * enabled && (opensAt == null || now >= opensAt) && (closesAt == null || now < closesAt)
 */
export const computeRegistrationStatus = (
  settings: RegistrationWindow | null | undefined,
  now: number = Date.now(),
): RegistrationStatus => {
  const opensAt = toMillis(settings?.opensAt);
  const closesAt = toMillis(settings?.closesAt);
  if (!settings || !settings.enabled) {
    return { state: 'closed', isOpen: false, opensAt, closesAt, nextChangeAt: null, label: 'Closed' };
  }
  if (opensAt != null && now < opensAt) {
    return { state: 'scheduled', isOpen: false, opensAt, closesAt, nextChangeAt: opensAt, label: 'Scheduled to open' };
  }
  if (closesAt != null && now >= closesAt) {
    return { state: 'ended', isOpen: false, opensAt, closesAt, nextChangeAt: null, label: 'Enrollment period ended' };
  }
  return { state: 'open', isOpen: true, opensAt, closesAt, nextChangeAt: closesAt, label: 'Open' };
};

/** "2d 4h", "3h 12m", "45m", "under a minute" */
export const formatCountdown = (ms: number): string => {
  if (ms <= 60_000) return 'under a minute';
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

/** The Philippines has no daylight saving time, so Asia/Manila is always UTC+08:00. */
export const MANILA_OFFSET_MINUTES = 8 * 60;

/** "2026-06-30T17:00" typed in Manila time → epoch millis. */
export const manilaLocalToMillis = (local: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - MANILA_OFFSET_MINUTES * 60_000;
};

/** epoch millis → "2026-06-30T17:00" in Manila time (for <input type="datetime-local">). */
export const millisToManilaLocal = (ms: number | null | undefined): string => {
  if (ms == null) return '';
  const date = new Date(ms + MANILA_OFFSET_MINUTES * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

/** "Jun 30, 2026, 5:00 PM" in Manila time, independent of the device time zone. */
export const formatManila = (ms: number | null | undefined): string => {
  if (ms == null) return '—';
  const date = new Date(ms + MANILA_OFFSET_MINUTES * 60_000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = date.getUTCHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${hours}:${minutes} ${suffix}`;
};
