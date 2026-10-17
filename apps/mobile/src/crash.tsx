/**
 * Startup-safe crash screen. In a release build a JavaScript error normally closes the app with no message;
 * this shows the error instead so it can be shared with the team.
 *
 * Loaded by index.ts BEFORE the app itself, so it imports only react / react-native (no theme, no
 * @wisepath/shared): an error while those load must still reach this screen.
 */
import * as React from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

// Brand colors copied from packages/shared/src/brand/tokens.ts (not imported, see above).
const C = { parchment: '#FFFDF8', surface: '#F6F1E6', navy: '#1F3350', navySoft: '#5B6E85', gold: '#9A6A1F', rust: '#B0503B', line: 'rgba(31,51,80,0.12)' };

interface CrashReport {
  message: string;
  stack: string;
  when: string;
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
}

const listeners = new Set<() => void>();
/** Every error reported since start (or since Try again). The first one is the root cause. */
const reports: CrashReport[] = [];

const toReport = (error: unknown): CrashReport => {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  return { message: `${e.name}: ${e.message}`, stack: e.stack ?? '', when: new Date().toISOString() };
};

const report = (error: unknown) => {
  reports.push(toReport(error));
  listeners.forEach((listener) => listener());
};

/** Routes fatal JS errors to the crash screen in release builds (development keeps the red error overlay). */
export function installCrashHandler() {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils || __DEV__) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) report(error);
    else previous(error, isFatal);
  });
}

/** The real app, required lazily so an error while its modules load is caught here. */
let LoadedApp: React.ComponentType | null = null;
const loadApp = () => {
  if (LoadedApp) return LoadedApp;
  const before = reports.length;
  try {
    // In a release build Metro does not throw here: it hands a module's load error to ErrorUtils
    // (reported above) and returns undefined, so check the result instead of reading .default blindly.
    const mod = require('./App') as { default?: React.ComponentType } | undefined;
    LoadedApp = mod?.default ?? null;
  } catch (error) {
    report(error);
  }
  if (!LoadedApp && reports.length === before) report(new Error('The app module did not load, and no error was reported.'));
  return LoadedApp;
};

interface RootState {
  failed: boolean;
  crashes: CrashReport[];
}

/** App root: the WisePath app inside an error boundary, or the crash screen. */
export class Root extends React.Component<object, RootState> {
  state: RootState = { failed: false, crashes: [] };
  private App = loadApp();

  static getDerivedStateFromError(): Partial<RootState> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    report(error);
  }

  componentDidMount() {
    listeners.add(this.sync);
    this.sync();
  }

  componentWillUnmount() {
    listeners.delete(this.sync);
  }

  private sync = () => {
    if (reports.length !== this.state.crashes.length) this.setState({ crashes: [...reports] });
  };

  private retry = () => {
    reports.length = 0;
    this.App = loadApp();
    this.setState({ failed: false, crashes: [...reports] });
  };

  render() {
    const { failed, crashes } = this.state;
    if (failed || crashes.length || !this.App) {
      const shown = crashes.length ? crashes : reports.length ? [...reports] : [toReport('The app could not start.')];
      return <CrashScreen crashes={shown} onRetry={this.retry} />;
    }
    const App = this.App;
    return <App />;
  }
}

function CrashScreen({ crashes, onRetry }: { crashes: CrashReport[]; onRetry: () => void }) {
  React.useEffect(() => {
    // The native splash stays up until the app hides it; hide it so this screen is visible.
    try {
      void (require('expo-splash-screen') as { hideAsync: () => Promise<void> }).hideAsync().catch(() => undefined);
    } catch {
      // ignore: nothing more we can do
    }
  }, []);

  const [first, ...later] = crashes;
  const details = [`WisePath 2.0 error (${first.when})`, ...crashes.map((c, i) => `#${i + 1} ${c.message}\n${c.stack}`)].join('\n\n');
  // Hermes and V8 start the stack with the message itself; skip that line.
  const stackLines = first.stack.split('\n').filter((line, i) => !(i === 0 && line.trim() === first.message));

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WISEPATH</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an error and stopped. Please take a screenshot of this page, or tap Share details, and send it to the WisePath team.
        </Text>
        <View style={styles.card}>
          <Text style={styles.message} selectable>
            {first.message}
          </Text>
          {stackLines.length ? (
            <Text style={styles.stack} selectable>
              {stackLines.slice(0, 14).join('\n')}
            </Text>
          ) : null}
          {later.length ? (
            <Text style={styles.stack} selectable>
              {later.map((c) => `Then: ${c.message}`).join('\n')}
            </Text>
          ) : null}
        </View>
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => void Share.share({ message: details }).catch(() => undefined)}>
          <Text style={styles.primaryText}>Share details</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={onRetry}>
          <Text style={styles.secondaryText}>Try again</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.parchment },
  content: { padding: 24, paddingTop: 64, gap: 14 },
  eyebrow: { color: C.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: C.navy, fontSize: 24, fontWeight: '700' },
  body: { color: C.navySoft, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  message: { color: C.rust, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  stack: { color: C.navySoft, fontSize: 11, lineHeight: 15, fontFamily: 'monospace' },
  primary: { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondary: { borderColor: C.line, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  secondaryText: { color: C.navy, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
