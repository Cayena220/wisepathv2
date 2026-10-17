import type { UserDoc } from '@wisepath/shared';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ClipboardList, Compass, GraduationCap, Trophy, UserRound } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader, T } from '../components/ui';
import { auth, db } from '../lib/firebase';
import { stampLogin } from '../services';
import { useCatalog } from '../stores/catalog';
import { useSession } from '../stores/session';
import { colors, fonts } from '../theme';
import type { AppStackParams, AuthStackParams, TabParams } from './types';

import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { RegistrationClosedScreen } from '../screens/auth/RegistrationClosedScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { AccountGateScreen } from '../screens/gates/AccountGateScreen';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';
import { AssessScreen } from '../screens/tabs/AssessScreen';
import { HomeScreen } from '../screens/tabs/HomeScreen';
import { ProfileScreen } from '../screens/tabs/ProfileScreen';
import { ProgressScreen } from '../screens/tabs/ProgressScreen';
import { ResultsScreen } from '../screens/tabs/ResultsScreen';
import { AttemptResultScreen } from '../screens/stack/AttemptResultScreen';
import { CareerAssessmentScreen } from '../screens/stack/CareerAssessmentScreen';
import { ChangePasswordScreen } from '../screens/stack/ChangePasswordScreen';
import { ProgramAssessmentScreen } from '../screens/stack/ProgramAssessmentScreen';
import { ProgramDetailScreen } from '../screens/stack/ProgramDetailScreen';
import { ProgramsBrowseScreen } from '../screens/stack/ProgramsBrowseScreen';
import { ResultDetailScreen } from '../screens/stack/ResultDetailScreen';

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const AppStack = createNativeStackNavigator<AppStackParams>();
const Tab = createBottomTabNavigator<TabParams>();
const SetupStack = createNativeStackNavigator<{ Setup: undefined }>();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' as const };

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={stackOptions}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="RegistrationClosed" component={RegistrationClosedScreen} />
    </AuthStack.Navigator>
  );
}

const TAB_ICONS = { Home: Compass, Assess: ClipboardList, Results: Trophy, Progress: GraduationCap, Profile: UserRound } as const;

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: 'rgba(255,253,248,0.97)',
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarActiveTintColor: colors.navy900,
        tabBarInactiveTintColor: colors.navy400,
        tabBarIcon: ({ focused, color }) => {
          const Icon = TAB_ICONS[route.name];
          return (
            <View
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.gold100 : 'transparent',
              }}
            >
              <Icon size={20} color={focused ? colors.gold700 : color} strokeWidth={focused ? 2.4 : 2} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Assess" component={AssessScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={stackOptions}>
      <AppStack.Screen name="Tabs" component={MainTabs} />
      <AppStack.Screen name="CareerAssessment" component={CareerAssessmentScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <AppStack.Screen name="ResultDetail" component={ResultDetailScreen} />
      <AppStack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
      <AppStack.Screen name="ProgramsBrowse" component={ProgramsBrowseScreen} />
      <AppStack.Screen name="ProgramAssessment" component={ProgramAssessmentScreen} options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <AppStack.Screen name="AttemptResult" component={AttemptResultScreen} />
      <AppStack.Screen name="EditProfile" component={ProfileSetupScreen} />
      <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </AppStack.Navigator>
  );
}

/**
 * Root gate:
 * signed out → auth stack · non-student → "use the website" · disabled → notice ·
 * no users doc → finish setup · profile incomplete → profile wizard · otherwise → app.
 */
export function RootNavigator() {
  const { user, account, authReady, registering, setUser, setAccount } = useSession();
  const loadCatalog = useCatalog((s) => s.load);
  const catalogStatus = useCatalog((s) => s.status);

  React.useEffect(() => onAuthStateChanged(auth, (next) => setUser(next)), [setUser]);

  React.useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => setAccount(snap.exists() ? ({ id: snap.id, ...snap.data() } as UserDoc) : null),
      () => setAccount(null),
    );
  }, [user, setAccount]);

  const isStudent = account?.role === 'student' && account.status !== 'disabled';
  React.useEffect(() => {
    if (user && isStudent) void stampLogin(user.uid);
  }, [user, isStudent]);

  React.useEffect(() => {
    if (user && isStudent && catalogStatus === 'idle') void loadCatalog();
  }, [user, isStudent, catalogStatus, loadCatalog]);

  if (!authReady) return <Loader label="Starting WisePath…" />;
  if (!user) return <AuthNavigator />;
  if (registering || account === undefined) return <Loader label="Opening your account…" />;
  if (account === null) return <AccountGateScreen kind="noAccount" />;
  if (account.role !== 'student') return <AccountGateScreen kind="staff" />;
  if (account.status === 'disabled') return <AccountGateScreen kind="disabled" />;
  if (!account.profileComplete)
    return (
      <SetupStack.Navigator screenOptions={stackOptions}>
        <SetupStack.Screen name="Setup" component={ProfileSetupScreen} />
      </SetupStack.Navigator>
    );
  return <AppNavigator />;
}

export function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <T variant="h2">WisePath</T>
    </View>
  );
}
