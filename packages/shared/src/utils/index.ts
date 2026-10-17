import type { FireTimestamp } from '../types';
import { toMillis } from '../registration/status';

export const progressDocId = (uid: string, programId: string) => `${uid}__${programId}`;

export const toNameLower = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

/** Short random id for nested items (options, questions, subjects). */
export const shortId = (prefix = '') => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i += 1) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return prefix ? `${prefix}_${id}` : id;
};

export const formatPeso = (value: number | null | undefined) =>
  value == null ? '—' : `₱${Math.round(value).toLocaleString('en-US')}`;

export const formatTuition = (range: { min: number; max: number } | null | undefined) =>
  range ? (range.min === range.max ? formatPeso(range.min) : `${formatPeso(range.min)}–${formatPeso(range.max)}`) : 'Not listed';

/** Parses "₱25,000–₱40,000" into numbers. */
export const parseTuitionRange = (text: string | null | undefined): { min: number; max: number; currency: 'PHP' } | null => {
  if (!text) return null;
  const numbers = (text.match(/[\d,]+/g) ?? []).map((part) => Number(part.replace(/,/g, ''))).filter((n) => n > 0);
  if (!numbers.length) return null;
  return { min: Math.min(...numbers), max: Math.max(...numbers), currency: 'PHP' };
};

export const tsMillis = (value: FireTimestamp | Date | number | null | undefined) => toMillis(value);

/** "just now", "5m ago", "3h ago", "2d ago", or a date. */
export const timeAgo = (value: FireTimestamp | Date | number | null | undefined, now = Date.now()): string => {
  const ms = toMillis(value);
  if (ms == null) return '—';
  const diff = Math.max(0, now - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDate = (value: FireTimestamp | Date | number | null | undefined, withTime = false): string => {
  const ms = toMillis(value);
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

export const initials = (name: string | null | undefined) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const firstName = (name: string | null | undefined) => (name || '').trim().split(/\s+/)[0] || 'there';
