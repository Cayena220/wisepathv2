/**
 * The career assessment scores answers on three broad dimensions. Each program
 * says how strongly it relates to each one (program.dimensionAffinity).
 *
 * v1 called these hospitality / it / criminal_justice, which collided with
 * program ids of the same name.
 */
export const DIMENSIONS = ['service', 'technology', 'justice'] as const;
export type DimensionId = (typeof DIMENSIONS)[number];
export type DimensionWeights = Partial<Record<DimensionId, number>>;

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  service: 'People & Service',
  technology: 'Technology & Analysis',
  justice: 'Justice & Public Service',
};

export const DIMENSION_DESCRIPTIONS: Record<DimensionId, string> = {
  service: 'Hospitality, communication, teaching, leading and caring for people.',
  technology: 'Computing, math, engineering, data and problem-solving.',
  justice: 'Rules, evidence, ethics, public safety and community service.',
};

export const LEGACY_DIMENSION_MAP: Record<string, DimensionId> = {
  hospitality: 'service',
  it: 'technology',
  criminal_justice: 'justice',
};

export const emptyDimensionScores = (): Record<DimensionId, number> => ({ service: 0, technology: 0, justice: 0 });
