import { colors as brand } from '@wisepath/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  ...brand,
  background: brand.parchment,
  text: brand.navy900,
  textMuted: brand.navy600,
  textFaint: brand.navy400,
  primary: brand.navy900,
  accent: brand.gold700,
  success: brand.teal600,
  danger: brand.rust600,
  white: '#FFFFFF',
  overlay: 'rgba(21,36,58,0.45)',
};

/** Android needs one font family per weight — fontWeight alone does not switch custom fonts. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

export const type: Record<'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'caption' | 'label', TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 } as const;

export const shadow: Record<'card' | 'lift', ViewStyle> = {
  card: Platform.select({
    android: { elevation: 2, shadowColor: brand.navy900 },
    default: { shadowColor: brand.navy900, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  })!,
  lift: Platform.select({
    android: { elevation: 6, shadowColor: brand.navy900 },
    default: { shadowColor: brand.navy900, shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  })!,
};
