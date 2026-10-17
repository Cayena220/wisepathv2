import { formatManila } from '@wisepath/shared';
import { CalendarClock, LockKeyhole, LogIn } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Card, Header, Screen, T } from '../../components/ui';
import type { AuthScreen } from '../../navigation/types';
import { useRegistrationStatus } from '../../services';
import { colors, space } from '../../theme';

const DEFAULT_MESSAGE = 'Registration for this school year is closed. Visit the admissions office if you still need an account.';

export function RegistrationClosedScreen({ navigation }: AuthScreen<'RegistrationClosed'>) {
  const registration = useRegistrationStatus();
  const scheduled = registration.state === 'scheduled' && registration.opensAt;
  return (
    <Screen
      background="auth"
      header={<Header />}
      footer={
        <View style={{ gap: 10 }}>
          {registration.isOpen && <Button title="Registration is open — continue" variant="gold" onPress={() => navigation.replace('Register')} />}
          <Button title="Sign in instead" icon={LogIn} variant={registration.isOpen ? 'outline' : 'primary'} onPress={() => navigation.navigate('Login')} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: space.lg, marginTop: space.xxxl }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.gold50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(194,135,46,0.25)' }}>
          {scheduled ? <CalendarClock size={32} color={colors.gold700} /> : <LockKeyhole size={32} color={colors.gold700} />}
        </View>
        <T variant="h1" center>
          {scheduled ? 'Registration opens soon' : 'Registration is closed'}
        </T>
        <T variant="body" color={colors.textMuted} center>
          {scheduled ? `New accounts can be created from ${formatManila(registration.opensAt)}.` : registration.settings?.closedMessage || DEFAULT_MESSAGE}
        </T>
        {registration.state === 'ended' && registration.closesAt && (
          <Card style={{ alignSelf: 'stretch' }}>
            <T variant="caption" color={colors.textMuted}>
              The enrollment period ended on
            </T>
            <T variant="h3">{formatManila(registration.closesAt)}</T>
          </Card>
        )}
        <T variant="bodySm" color={colors.textMuted} center>
          Already have an account? You can still sign in any time.
        </T>
      </View>
    </Screen>
  );
}
