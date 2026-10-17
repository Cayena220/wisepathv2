import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type AuthStackParams = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  RegistrationClosed: undefined;
};

export type TabParams = {
  Home: undefined;
  Assess: undefined;
  Results: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type AppStackParams = {
  Tabs: NavigatorScreenParams<TabParams>;
  CareerAssessment: undefined;
  ResultDetail: { resultId: string; fresh?: boolean };
  ProgramDetail: { programId: string };
  ProgramsBrowse: { departmentId?: string };
  ProgramAssessment: { assessmentId: string };
  AttemptResult: { attemptId: string; fresh?: boolean };
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type AuthScreen<K extends keyof AuthStackParams> = NativeStackScreenProps<AuthStackParams, K>;
export type AppScreen<K extends keyof AppStackParams> = NativeStackScreenProps<AppStackParams, K>;
export type TabScreen<K extends keyof TabParams> = CompositeScreenProps<
  BottomTabScreenProps<TabParams, K>,
  NativeStackScreenProps<AppStackParams>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AppStackParams {}
  }
}
