import { KeyRound } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { Button, ErrorBanner, Field, Header, Screen } from '../../components/ui';
import { errorText } from '../../lib/hooks';
import type { AppScreen } from '../../navigation/types';
import { changePassword } from '../../services';
import { space } from '../../theme';

export function ChangePasswordScreen({ navigation }: AppScreen<'ChangePassword'>) {
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setError(null);
    if (next.length < 6) return setError('Use at least 6 characters.');
    if (next !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(current, next);
      showAlert('Password updated');
      navigation.goBack();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title="Change password" />}>
      <View style={{ gap: space.lg }}>
        {error && <ErrorBanner message={error} />}
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button title="Update password" icon={KeyRound} onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
