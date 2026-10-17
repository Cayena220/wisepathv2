import { compassRose, portraitGeometry as g } from '@wisepath/shared';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The WisePath background: parchment gradient, soft teal/gold light, a dashed route with
 * waypoints and a compass rose (same geometry family as the website).
 * `auth` = strong version for welcome/sign-in, `screen` = quiet version behind content.
 */
function AppBackgroundBase({ variant = 'screen' }: { variant?: 'screen' | 'auth' }) {
  const strong = variant === 'auth';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${g.width} ${g.height}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFDF8" />
            <Stop offset="1" stopColor="#F6F1E6" />
          </LinearGradient>
          {g.blobs.map((b, i) => (
            <RadialGradient key={i} id={`blob${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.tone === 'teal' ? '#3E7A6C' : '#C2872E'} stopOpacity={strong ? 0.24 : 0.12} />
              <Stop offset="1" stopColor="#FFFDF8" stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width={g.width} height={g.height} fill="url(#bg)" />
        {g.blobs.map((b, i) => (
          <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#blob${i})`} />
        ))}
        <Path d={g.routeEcho} fill="none" stroke="#1F3350" strokeOpacity={0.06} strokeWidth={1.5} strokeDasharray="2 8" strokeLinecap="round" />
        <Path
          d={g.route}
          fill="none"
          stroke="#C2872E"
          strokeOpacity={strong ? 0.55 : 0.3}
          strokeWidth={strong ? 2.5 : 2}
          strokeDasharray="8 9"
          strokeLinecap="round"
        />
        {g.waypoints.map((w, i) => (
          <G key={i} opacity={strong ? 0.9 : 0.55}>
            <Circle cx={w.x} cy={w.y} r={w.r * 2.4} fill="#C2872E" opacity={0.15} />
            <Circle cx={w.x} cy={w.y} r={w.r} fill="#FFFDF8" stroke="#C2872E" strokeWidth={2} />
          </G>
        ))}
        <G transform={`translate(${g.compass.x} ${g.compass.y}) scale(${g.compass.size})`} opacity={strong ? 0.1 : 0.06}>
          {compassRose.rings.map((r) => (
            <Circle key={r} r={r} fill="none" stroke="#1F3350" strokeWidth={0.014} />
          ))}
          <Path d={compassRose.minor} fill="#1F3350" transform="rotate(45)" />
          <Path d={compassRose.major} fill="#1F3350" />
        </G>
      </Svg>
    </View>
  );
}

export const AppBackground = memo(AppBackgroundBase);
