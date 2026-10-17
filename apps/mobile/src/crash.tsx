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

const listeners = new Set<(report: CrashReport) => void>();
let lastReport: CrashReport | null = null;

const toReport = (error: unknown): CrashReport => {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  return { message: `${e.name}: ${e.message}`, stack: e.stack ?? '', when: new Date().toISOString() };
};

const report = (error: unknown) => {
  lastReport = toReport(error);
  listeners.forEach((listener) => listener(lastReport!));
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
  try {
    LoadedApp = (require('./App') as { default: React.ComponentType }).default;
  } catch (error) {
    report(error);
  }
  return LoadedApp;
};

interface RootState {
  crash: CrashReport | null;
}

/** App root: the WisePath app inside an error boundary, or the crash screen. */
export class Root extends React.Component<object, RootState> {
  state: RootState = { crash: null };
  private App = loadApp();

  static getDerivedStateFromError(error: unknown): RootState {
    return { crash: toReport(error) };
  }

  componentDidMount() {
    listeners.add(this.onCrash);
    if (lastReport) this.setState({ crash: lastReport });
  }

  componentWillUnmount() {
    listeners.delete(this.onCrash);
  }

  private onCrash = (crash: CrashReport) => this.setState({ crash });

  private retry = () => {
    lastReport = null;
    this.App = loadApp();
    this.setState({ crash: null });
  };

  render() {
    const { crash } = this.state;
    if (crash || !this.App) return <CrashScreen report={crash ?? lastReport ?? toReport('The app could not start.')} onRetry={this.retry} />;
    const App = this.App;
    return <App />;
  }
}

function CrashScreen({ report: crash, onRetry }: { report: CrashReport; onRetry: () => void }) {
  React.useEffect(() => {
    // The native splash stays up until the app hides it; hide it so this screen is visible.
    try {
      void (require('expo-splash-screen') as { hideAsync: () => Promise<void> }).hideAsync().catch(() => undefined);
    } catch {
      // ignore: nothing more we can do
    }
  }, []);

  const details = `WisePath 2.0 error (${crash.when})\n${crash.message}\n\n${crash.stack}`;
  // Hermes and V8 start the stack with the message itself; skip that line.
  const stackLines = crash.stack.split('\n').filter((line, i) => !(i === 0 && line.trim() === crash.message));

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
            {crash.message}
          </Text>
          {stackLines.length ? (
            <Text style={styles.stack} selectable>
              {stackLines.slice(0, 14).join('\n')}
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
