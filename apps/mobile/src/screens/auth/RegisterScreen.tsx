import { formatManila } from '@wisepath/shared';
import { Check, ShieldCheck, UserPlus } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { Button, ErrorBanner, Field, Header, Loader, Screen, T, Tap } from '../../components/ui';
import { errorText } from '../../lib/hooks';
import type { AuthScreen } from '../../navigation/types';
import { RegistrationClosedError, registerStudent, useRegistrationStatus } from '../../services';
import { colors, radius, space } from '../../theme';

export function RegisterScreen({ navigation }: AuthScreen<'Register'>) {
  const registration = useRegistrationStatus();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // If the Super Admin closes registration while this screen is open, move to the closed screen.
  React.useEffect(() => {
    if (!registration.loading && !registration.isOpen && !busy) navigation.replace('RegistrationClosed');
  }, [registration.loading, registration.isOpen, busy, navigation]);

  if (registration.loading) return <Loader label="Checking registration…" />;

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use at least 6 characters for your password.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!consent) return setError('Please agree to the data privacy notice.');
    setBusy(true);
    try {
      await registerStudent(name, email, password);
    } catch (e) {
      setBusy(false);
      if (e instanceof RegistrationClosedError) navigation.replace('RegistrationClosed');
      else setError(errorText(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Screen background="auth" header={<Header title="Create your account" />}>
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.green100, borderRadius: radius.md, padding: space.md }}>
            <ShieldCheck size={18} color={colors.green600} />
            <T variant="bodySm" color={colors.navy900} style={{ flex: 1 }}>
              Registration is open
              {registration.closesAt ? ` until ${formatManila(registration.closesAt)}` : ''}.
            </T>
          </View>
          {error && <ErrorBanner message={error} />}
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" placeholder="Juan Dela Cruz" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@email.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry hint="At least 6 characters." autoComplete="new-password" />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
          <Tap onPress={() => setConsent((c) => !c)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: consent ? colors.navy900 : colors.lineStrong,
                backgroundColor: consent ? colors.navy900 : colors.white,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {consent && <Check size={14} color={colors.white} strokeWidth={3} />}
            </View>
            <T variant="bodySm" color={colors.textMuted} style={{ flex: 1 }}>
              I agree that WisePath stores my profile and assessment answers to recommend programs. Department admins see my results for their programs. (Data Privacy Act of 2012)
            </T>
          </Tap>
          <Button title="Create account" icon={UserPlus} variant="gold" onPress={submit} loading={busy} />
          <Tap onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'center', padding: 8 }}>
            <T variant="bodySm" color={colors.textMuted}>
              Already registered? <T variant="bodySm" weight="semibold" color={colors.teal700}>Sign in</T>
            </T>
          </Tap>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
