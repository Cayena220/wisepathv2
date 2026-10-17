import type { DimensionId } from '../constants/dimensions';
import { DIMENSION_LABELS } from '../constants/dimensions';
import type { Program, RankedProgram } from '../types';
import { dominantDimension, type ScoringProfile } from './careerEngine';

const STRENGTHS_BY_DIMENSION: Record<DimensionId, string[]> = {
  service: ['Strong interpersonal and service mindset', 'Comfort leading people and operations'],
  technology: ['Logical problem-solving and technical curiosity', 'Adaptable with digital tools and systems'],
  justice: ['Ethical judgment and attention to detail', 'Drive for public service and community impact'],
};

const asList = (value: string[] | string | undefined): string[] =>
  Array.isArray(value) ? value : value ? [String(value)] : [];

/** Up to four short strengths: two from the profile, then two per top program's leading dimension. */
export const deriveStrengths = (
  profile: ScoringProfile | null | undefined,
  rankings: RankedProgram[],
  programsById: Map<string, Pick<Program, 'dimensionAffinity'>>,
): string[] => {
  const lines: string[] = [];
  const interests = asList(profile?.careerInterests);
  if (interests.length) lines.push(`Interests aligned with ${interests.slice(0, 2).join(' & ')}`);
  const goals = asList(profile?.learningGoals);
  if (goals.length) lines.push(`Motivated by: ${goals[0]}`);

  for (const row of rankings.slice(0, 2)) {
    const program = programsById.get(row.programId);
    const dimension = program ? dominantDimension(program) : null;
    for (const line of dimension ? STRENGTHS_BY_DIMENSION[dimension] : []) {
      if (!lines.includes(line)) lines.push(line);
    }
  }
  return (lines.length ? lines : STRENGTHS_BY_DIMENSION.technology).slice(0, 4);
};

/**
 * A short, deterministic guidance paragraph built from the profile and the top matches.
 * It is a template, not an AI response, and the apps label it that way.
 */
export const buildGuidanceSummary = (
  profile: (ScoringProfile & { name?: string }) | null | undefined,
  top3: RankedProgram[],
  dimensionScores: Record<DimensionId, number>,
): string => {
  if (!top3.length) return 'Complete the career assessment to see your guidance summary.';
  const [first, second, third] = top3;
  const interests = asList(profile?.careerInterests);
  const leading = (Object.entries(dimensionScores) as [DimensionId, number][])
    .sort((a, b) => b[1] - a[1])
    .find(([, value]) => value > 0)?.[0];

  const parts: string[] = [];
  const basis: string[] = [];
  if (interests.length) basis.push(`your interest in ${interests.slice(0, 2).join(' and ')}`);
  if (profile?.shsStrand && profile.shsStrand !== 'N/A') basis.push(`your ${profile.shsStrand} background`);
  if (leading) basis.push(`answers that lean toward ${DIMENSION_LABELS[leading].toLowerCase()}`);

  parts.push(
    `${basis.length ? `Based on ${basis.join(', ')}, ` : ''}${first.programTitle} is your strongest match at ${first.matchPercent}%.`,
  );
  if (second && third) {
    parts.push(`${second.programTitle} (${second.matchPercent}%) and ${third.programTitle} (${third.matchPercent}%) are also worth exploring.`);
  } else if (second) {
    parts.push(`${second.programTitle} (${second.matchPercent}%) is also worth exploring.`);
  }
  parts.push('Take a program assessment to check your fit before you decide, and talk with a guidance counselor about your options.');
  return parts.join(' ');
};
