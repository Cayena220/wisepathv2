import { useNavigation } from '@react-navigation/native';
import { AlertCircle, ChevronLeft, Inbox, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, radius, shadow, space, type, type FontWeight } from '../theme';
import { AppBackground } from './AppBackground';

// ---------------------------------------------------------------- Text
export function T({
  variant = 'body',
  weight,
  color,
  center,
  style,
  ...props
}: TextProps & { variant?: keyof typeof type; weight?: FontWeight; color?: string; center?: boolean }) {
  return (
    <Text
      {...props}
      style={[type[variant], { color: color ?? colors.text }, weight && { fontFamily: fonts[weight] }, center && { textAlign: 'center' }, style]}
    />
  );
}

// ---------------------------------------------------------------- Pressable with press feedback
export function Tap({ style, children, ...props }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [style, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }, props.disabled && { opacity: 0.5 }]}
    >
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Button
type ButtonVariant = 'primary' | 'gold' | 'teal' | 'outline' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.navy900, fg: colors.white },
    gold: { bg: colors.gold700, fg: colors.white },
    teal: { bg: colors.teal600, fg: colors.white },
    outline: { bg: colors.white, fg: colors.navy900, border: colors.lineStrong },
    ghost: { bg: 'transparent', fg: colors.navy700 },
    danger: { bg: colors.white, fg: colors.rust600, border: 'rgba(176,80,59,0.35)' },
  };
  const p = palette[variant];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent' },
        variant !== 'ghost' && variant !== 'outline' && variant !== 'danger' && shadow.card,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {Icon && <Icon size={small ? 16 : 18} color={p.fg} />}
          <T variant={small ? 'bodySm' : 'body'} weight="semibold" color={p.fg}>
            {title}
          </T>
          {IconRight && <IconRight size={small ? 16 : 18} color={p.fg} />}
        </>
      )}
    </Tap>
  );
}

// ---------------------------------------------------------------- Card
export function Card({ style, children, onPress, accent }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?: () => void; accent?: string }) {
  const body = (
    <View style={[styles.card, accent && { borderLeftWidth: 4, borderLeftColor: accent }, style]}>{children}</View>
  );
  return onPress ? (
    <Tap onPress={onPress} accessibilityRole="button">
      {body}
    </Tap>
  ) : (
    body
  );
}

// ---------------------------------------------------------------- Chip (selectable)
export function Chip({ label, selected, onPress, small }: { label: string; selected?: boolean; onPress?: () => void; small?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(selected) }}
      style={[styles.chip, small && { paddingVertical: 6, paddingHorizontal: 11 }, selected && styles.chipSelected]}
    >
      <T variant="bodySm" weight={selected ? 'semibold' : 'medium'} color={selected ? colors.white : colors.navy700}>
        {label}
      </T>
    </Tap>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'teal' | 'gold' | 'rust' | 'green' | 'navy' }) {
  const tones = {
    neutral: { bg: colors.navy100, fg: colors.navy700 },
    teal: { bg: colors.teal100, fg: colors.teal700 },
    gold: { bg: colors.gold100, fg: colors.gold700 },
    rust: { bg: colors.rust100, fg: colors.rust600 },
    green: { bg: colors.green100, fg: colors.green600 },
    navy: { bg: colors.navy900, fg: colors.white },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg }]}>
      <T variant="caption" weight="semibold" color={tones.fg}>
        {label}
      </T>
    </View>
  );
}

// ---------------------------------------------------------------- Field
export function Field({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T variant="bodySm" weight="semibold">
        {label}
      </T>
      <TextInput
        placeholderTextColor={colors.navy400}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, error ? { borderColor: colors.rust600 } : null, style as StyleProp<TextStyle>]}
      />
      {error ? (
        <T variant="caption" color={colors.rust600}>
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color={colors.textMuted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Screen
export function Screen({
  children,
  scroll = true,
  background = 'screen',
  padded = true,
  refreshControl,
  header,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  background?: 'screen' | 'auth';
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBackground variant={background} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {header}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            contentContainerStyle={[padded && { padding: space.xl, paddingBottom: space.xxxl + (footer ? 0 : insets.bottom) }, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && { padding: space.xl }, contentStyle]}>{children}</View>
        )}
        {footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>{footer}</View>}
      </SafeAreaView>
    </View>
  );
}

export function Header({ title, subtitle, right, back = true }: { title?: string; subtitle?: string; right?: React.ReactNode; back?: boolean }) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      {back && navigation.canGoBack() ? (
        <Tap onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={22} color={colors.navy900} />
        </Tap>
      ) : (
        <View style={{ width: 4 }} />
      )}
      <View style={{ flex: 1 }}>
        {title && (
          <T variant="h3" numberOfLines={1}>
            {title}
          </T>
        )}
        {subtitle && (
          <T variant="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </T>
        )}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md, marginTop: space.xxl }}>
      <T variant="h3">{title}</T>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------- States
export function Loader({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
      <ActivityIndicator color={colors.gold700} size="large" />
      {label && (
        <T variant="bodySm" color={colors.textMuted}>
          {label}
        </T>
      )}
    </View>
  );
}

export function EmptyState({ title, body, icon: Icon = Inbox, action }: { title: string; body?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 8 }}>
      <View style={styles.emptyIcon}>
        <Icon size={22} color={colors.gold700} />
      </View>
      <T variant="h3" center>
        {title}
      </T>
      {body && (
        <T variant="bodySm" color={colors.textMuted} center>
          {body}
        </T>
      )}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.error}>
      <AlertCircle size={18} color={colors.rust600} />
      <T variant="bodySm" color={colors.rust600} style={{ flex: 1 }}>
        {message}
      </T>
    </View>
  );
}

// ---------------------------------------------------------------- Progress
export function ProgressBar({ value, color = colors.teal600, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.navy100, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Ring({
  value,
  size = 88,
  stroke = 9,
  color = colors.teal600,
  track = colors.navy100,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, value)) / 100) * c} ${c}`}
        />
      </Svg>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(31,51,80,0.07)',
    ...shadow.card,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  inputFocused: { borderColor: colors.gold500, borderWidth: 1.5 },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    backgroundColor: 'rgba(255,253,248,0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 52 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.gold50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194,135,46,0.2)',
  },
  error: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.rust100,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(176,80,59,0.2)',
  },
});
