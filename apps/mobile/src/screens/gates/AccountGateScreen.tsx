import { Globe, LogOut, ShieldOff, UserRoundPlus } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Button, ErrorBanner, Field, Screen, T } from '../../components/ui';
import { errorText } from '../../lib/hooks';
import { createStudentDoc, signOut, useRegistrationStatus } from '../../services';
import { useSession } from '../../stores/session';
import { colors, space } from '../../theme';

/** Shown instead of the app when the signed-in account can't use it (yet). */
export function AccountGateScreen({ kind }: { kind: 'staff' | 'disabled' | 'noAccount' }) {
  const user = useSession((s) => s.user);
  const registration = useRegistrationStatus();
  const [name, setName] = React.useState(user?.displayName ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const finish = async () => {
    if (!user || name.trim().length < 2) return setError('Enter your full name.');
    setBusy(true);
    setError(null);
    try {
      await createStudentDoc(user.uid, user.email ?? '', name);
    } catch (e) {
      setError((e as { code?: string }).code === 'permission-denied' ? 'Registration is closed, so this account cannot be set up right now.' : errorText(e));
      setBusy(false);
    }
  };

  const content = {
    staff: {
      icon: Globe,
      title: 'Use the WisePath website',
      body: 'This is an admin account. Admins and the Super Admin manage WisePath on the website, not in the student app.',
    },
    disabled: {
      icon: ShieldOff,
      title: 'Account disabled',
      body: 'This account has been turned off. Please contact your school’s WisePath administrator.',
    },
    noAccount: {
      icon: UserRoundPlus,
      title: 'Finish setting up',
      body: registration.isOpen
        ? 'Your login exists but your student account was not created. Add your name to finish.'
        : 'Your login exists but your student account was not created, and registration is closed right now.',
    },
  }[kind];
  const Icon = content.icon;

  return (
    <Screen background="auth" footer={<Button title="Sign out" icon={LogOut} variant="outline" onPress={() => void signOut()} />}>
      <View style={{ alignItems: 'center', gap: space.lg, marginTop: space.xxxl * 2 }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.gold50, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={32} color={colors.gold700} />
        </View>
        <T variant="h1" center>
          {content.title}
        </T>
        <T variant="body" color={colors.textMuted} center>
          {content.body}
        </T>
        <T variant="bodySm" color={colors.textFaint} center>
          {user?.email}
        </T>
      </View>
      {kind === 'noAccount' && registration.isOpen && (
        <View style={{ gap: space.lg, marginTop: space.xxl }}>
          {error && <ErrorBanner message={error} />}
          <Field label="Full name" value={name} onChangeText={setName} />
          <Button title="Finish setup" variant="gold" onPress={finish} loading={busy} />
        </View>
      )}
    </Screen>
  );
}
