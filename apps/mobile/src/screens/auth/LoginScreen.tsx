import { LogIn } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { LogoMark } from '../../components/brand';
import { Button, ErrorBanner, Field, Header, Screen, T, Tap } from '../../components/ui';
import { errorText } from '../../lib/hooks';
import type { AuthScreen } from '../../navigation/types';
import { signIn } from '../../services';
import { colors, space } from '../../theme';

export function LoginScreen({ navigation }: AuthScreen<'Login'>) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Screen background="auth" header={<Header />}>
        <View style={{ gap: space.lg }}>
          <LogoMark size={48} />
          <View>
            <T variant="h1">Welcome back</T>
            <T variant="body" color={colors.textMuted}>
              Sign in to see your matches and progress.
            </T>
          </View>
          {error && <ErrorBanner message={error} />}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@email.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
          <Tap onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end' }}>
            <T variant="bodySm" weight="semibold" color={colors.teal700}>
              Forgot password?
            </T>
          </Tap>
          <Button title="Sign in" icon={LogIn} onPress={submit} loading={busy} />
          <Tap onPress={() => navigation.navigate('Register')} style={{ alignSelf: 'center', padding: 8 }}>
            <T variant="bodySm" color={colors.textMuted}>
              New here? <T variant="bodySm" weight="semibold" color={colors.teal700}>Create an account</T>
            </T>
          </Tap>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
