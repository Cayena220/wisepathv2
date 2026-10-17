import { formatManila } from '@wisepath/shared';
import { ArrowRight, Compass, GraduationCap, Sparkles, Trophy } from 'lucide-react-native';
import { View } from 'react-native';
import { LogoMark, Wordmark } from '../../components/brand';
import { Button, Card, Screen, T } from '../../components/ui';
import type { AuthScreen } from '../../navigation/types';
import { useRegistrationStatus } from '../../services';
import { colors, space } from '../../theme';

export function WelcomeScreen({ navigation }: AuthScreen<'Welcome'>) {
  const registration = useRegistrationStatus();
  const features = [
    { icon: Compass, title: 'Find your path', body: 'A short career assessment ranks your top 3 programs.' },
    { icon: Trophy, title: 'See why', body: 'Tap any result for your strengths and the full ranking.' },
    { icon: GraduationCap, title: 'Check your fit', body: 'Take a program’s fit check and track your progress.' },
  ];
  return (
    <Screen
      background="auth"
      footer={
        <View style={{ gap: 10 }}>
          <Button
            title={registration.isOpen ? 'Create student account' : 'Registration closed'}
            variant="gold"
            iconRight={ArrowRight}
            onPress={() => navigation.navigate(registration.isOpen ? 'Register' : 'RegistrationClosed')}
          />
          <Button title="I already have an account" variant="outline" onPress={() => navigation.navigate('Login')} />
        </View>
      }
    >
      <View style={{ alignItems: 'flex-start', gap: space.lg, marginTop: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LogoMark size={52} />
          <View>
            <Wordmark size={26} />
            <T variant="caption" color={colors.textMuted}>
              STI West Negros University
            </T>
          </View>
        </View>
        <T variant="display" style={{ marginTop: space.xl }}>
          Find the college program that <T variant="display" color={colors.gold700}>fits you.</T>
        </T>
        <T variant="body" color={colors.textMuted}>
          Answer a few questions about your interests and goals, and WisePath will guide you to programs that match — then help you track your journey.
        </T>
      </View>

      <View style={{ gap: space.md, marginTop: space.xxl }}>
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.teal50, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={22} color={colors.teal700} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="h3">{title}</T>
              <T variant="bodySm" color={colors.textMuted}>
                {body}
              </T>
            </View>
          </Card>
        ))}
      </View>

      {!registration.loading && !registration.isOpen && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: space.xl, padding: space.md, borderRadius: 14, backgroundColor: colors.gold50 }}>
          <Sparkles size={18} color={colors.gold700} />
          <T variant="bodySm" style={{ flex: 1 }}>
            {registration.state === 'scheduled' && registration.opensAt
              ? `Registration opens on ${formatManila(registration.opensAt)}.`
              : 'New student registration is closed right now. You can still sign in.'}
          </T>
        </View>
      )}
    </Screen>
  );
}
