import { MailCheck } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Button, Field, Header, Screen, T } from '../../components/ui';
import type { AuthScreen } from '../../navigation/types';
import { resetPassword } from '../../services';
import { colors, space } from '../../theme';

export function ForgotPasswordScreen({ navigation }: AuthScreen<'ForgotPassword'>) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    await resetPassword(email).catch(() => undefined); // same message either way
    setBusy(false);
    setSent(true);
  };
  return (
    <Screen background="auth" header={<Header title="Reset password" />}>
      {sent ? (
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xxxl }}>
          <MailCheck size={40} color={colors.teal700} />
          <T variant="h2" center>
            Check your email
          </T>
          <T variant="body" color={colors.textMuted} center>
            If {email} has a WisePath account, we sent a link to choose a new password.
          </T>
          <Button title="Back to sign in" variant="outline" onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
        </View>
      ) : (
        <View style={{ gap: space.lg }}>
          <T variant="body" color={colors.textMuted}>
            Enter the email you registered with and we’ll send you a reset link.
          </T>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title="Send reset link" onPress={submit} loading={busy} />
        </View>
      )}
    </Screen>
  );
}
