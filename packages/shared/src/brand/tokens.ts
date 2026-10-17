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

/** Chart / department colors, in seed order. */
export const departmentPalette = [
  '#3E7A6C', // teal
  '#1F3350', // navy
  '#C2872E', // gold
  '#B0503B', // rust
  '#6B4E8A', // plum
  '#3F7CA6', // sky
  '#7A8B3C', // olive
] as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 } as const;
