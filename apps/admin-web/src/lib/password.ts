import { LIMITS } from '@wisepath/shared';

const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*?-'];

const randomIndex = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

/** One-time password: 16 chars, at least one upper, lower, digit and symbol, no look-alikes. */
export const generateTempPassword = (length: number = LIMITS.tempPasswordLength) => {
  const all = SETS.join('');
  const chars = SETS.map((set) => set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
}

export const passwordStrength = (password: string): PasswordStrength => {
  const issues: string[] = [];
  if (password.length < LIMITS.minAdminPasswordLength) issues.push(`At least ${LIMITS.minAdminPasswordLength} characters`);
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) issues.push('Upper and lower case letters');
  if (!/\d/.test(password)) issues.push('A number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('A symbol');
  const passed = 4 - issues.length;
  const bonus = password.length >= 14 ? 1 : 0;
  const score = Math.max(0, Math.min(4, passed + bonus - 1)) as PasswordStrength['score'];
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, issues };
};
