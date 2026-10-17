import { initials } from '@wisepath/shared';
import { Image, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';
import { T } from './ui';

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="16" fill="#1F3350" />
      <Path d="M32 9 L36.5 27.5 L55 32 L36.5 36.5 L32 55 L27.5 36.5 L9 32 L27.5 27.5 Z" fill="#C2872E" />
      <Path d="M32 20 L34.5 29.5 L44 32 L34.5 34.5 L32 44 L29.5 34.5 L20 32 L29.5 29.5 Z" fill="#FFFDF8" />
      <Circle cx="32" cy="32" r="3" fill="#1F3350" />
    </Svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <T style={{ fontSize: size, lineHeight: size * 1.2 }} weight="bold">
      Wise<T style={{ fontSize: size, lineHeight: size * 1.2 }} weight="bold" color={colors.gold700}>Path</T>
    </T>
  );
}

export function Avatar({ name, uri, size = 56 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 3, borderWidth: 2, borderColor: colors.white }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white }}>
      <T weight="bold" color={colors.white} style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </T>
    </View>
  );
}
