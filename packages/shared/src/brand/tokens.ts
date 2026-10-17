/**
 * WisePath brand: parchment, compass gold, route teal, ink navy.
 * Gold #C2872E is for decoration, charts and large shapes; use gold700 for text
 * and filled buttons so white text meets WCAG AA contrast.
 */
export const colors = {
  parchment: '#FFFDF8',
  surface: '#F6F1E6',
  card: '#FFFFFF',
  gold500: '#C2872E',
  gold700: '#9A6A1F',
  gold100: '#F3E4C4',
  gold50: '#FBF5E8',
  teal600: '#3E7A6C',
  teal700: '#2F5F54',
  teal100: '#DCEAE3',
  teal50: '#EEF5F1',
  navy900: '#1F3350',
  navy700: '#33496A',
  navy600: '#5B6E85',
  navy400: '#8D9BAE',
  navy200: '#C9D1DC',
  navy100: '#E4E8EE',
  rust600: '#B0503B',
  rust100: '#F6E4DF',
  green600: '#2F7D55',
  green100: '#DDF0E4',
  amber600: '#B7791F',
  amber100: '#FBEBCB',
  line: 'rgba(31,51,80,0.12)',
  lineStrong: 'rgba(31,51,80,0.24)',
} as const;

/**
 * Chart colors (validated with the dataviz palette checks: lightness band, chroma floor,
 * colorblind separation and normal-vision floor on a white card surface).
 * Categorical = identity, assigned in this fixed order and never cycled.
 * The three lighter slots (aqua, yellow, magenta) are below 3:1 contrast, so charts using
 * them always show visible text labels next to the marks.
 */
export const vizCategorical = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#6250d6', // violet
  '#e34948', // red
] as const;

/** Ordinal ramp (one hue, light → dark) for ordered steps: funnel stages, score bands. */
export const vizOrdinal = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'] as const;

/** Single-series charts use slot 1. */
export const vizSeries = vizCategorical[0];

/** Chart chrome: hairline grid, axis/baseline, muted tick text. */
export const vizChrome = { grid: '#e8e6df', axis: '#c9c6bb', tick: '#6f6d66' } as const;

/** Department identity colors, in seed order (one categorical slot each). */
export const departmentPalette = vizCategorical.slice(0, 7);

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 } as const;
