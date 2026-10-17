import { initials } from '@wisepath/shared';
import { Image, View } from 'react-native';
import { colors } from '../theme';
import { T } from './ui';

const MARK = require('../../assets/brand/wisepath-mark.png');
const WORDMARK = require('../../assets/brand/wisepath-wordmark.png');
const FULL = require('../../assets/brand/wisepath-logo.png');

/** Graduation cap + open book + path. `size` is the height in dp. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return <Image source={MARK} style={{ height: size, width: size * (512 / 473) }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** "WISEPATH" lettering. `size` is the height in dp. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return <Image source={WORDMARK} style={{ height: size, width: size * (600 / 134) }} resizeMode="contain" accessibilityLabel="WisePath" />;
}

/** Full logo: mark + WISEPATH + "Smart Course Recommendation". `width` in dp. */
export function LogoFull({ width = 200 }: { width?: number }) {
  return <Image source={FULL} style={{ width, height: width * (800 / 740) }} resizeMode="contain" accessibilityLabel="WisePath — Smart Course Recommendation" />;
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
