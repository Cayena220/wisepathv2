import { incomeLabel, studentStatusLabel } from '@wisepath/shared';
import { doc } from 'firebase/firestore';
import { ChevronRight, Info, KeyRound, LogOut, Pencil } from 'lucide-react-native';
import { View } from 'react-native';
import { showAlert } from '../../lib/alert';
import { Avatar } from '../../components/brand';
import { Card, Pill, Screen, SectionTitle, T, Tap } from '../../components/ui';
import { db, useEmulators } from '../../lib/firebase';
import { useLiveDoc } from '../../lib/hooks';
import type { TabScreen } from '../../navigation/types';
import { signOut } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, space } from '../../theme';

function Row({ icon: Icon, label, onPress, danger }: { icon: typeof Pencil; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Tap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }} accessibilityRole="button">
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: danger ? colors.rust100 : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={danger ? colors.rust600 : colors.navy700} />
      </View>
      <T variant="body" weight="medium" color={danger ? colors.rust600 : colors.navy900} style={{ flex: 1 }}>
        {label}
      </T>
      {!danger && <ChevronRight size={18} color={colors.navy400} />}
    </Tap>
  );
}

export function ProfileScreen({ navigation }: TabScreen<'Profile'>) {
  const { uid, email, account } = useStudent();
  const photo = useLiveDoc<{ dataUri: string }>(account?.hasPhoto ? doc(db, 'userPhotos', uid) : null, `photo:${uid}:${account?.hasPhoto}`);
  const p = account?.profile;

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, marginTop: space.lg }}>
        <Avatar name={p?.name ?? account?.displayName ?? ''} uri={photo.data?.dataUri} size={96} />
        <T variant="h1" center>
          {p?.name ?? account?.displayName}
        </T>
        <T variant="bodySm" color={colors.textMuted}>
          {email}
        </T>
        <Pill label={studentStatusLabel(p?.studentStatus)} tone="gold" />
      </View>

      <SectionTitle title="Your learning profile" />
      <Card style={{ gap: 12 }}>
        {[
          ['Strand', p?.shsStrand],
          ['Skill level', p?.currentSkills],
          ['Learning style', p?.learningStyle],
          ['Family income', incomeLabel(p?.parentalIncomeLevel)],
        ].map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <T variant="bodySm" color={colors.textMuted}>
              {label}
            </T>
            <T variant="bodySm" weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>
              {value || '—'}
            </T>
          </View>
        ))}
        <View style={{ gap: 6 }}>
          <T variant="bodySm" color={colors.textMuted}>
            Career interests
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(p?.careerInterests ?? []).map((i) => (
              <Pill key={i} label={i} tone="teal" />
            ))}
          </View>
        </View>
      </Card>

      <SectionTitle title="Account" />
      <Card style={{ paddingVertical: 4 }}>
        <Row icon={Pencil} label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
        <Row icon={KeyRound} label="Change password" onPress={() => navigation.navigate('ChangePassword')} />
        <Row
          icon={Info}
          label="About WisePath"
          onPress={() =>
            showAlert(
              'WisePath 2.0',
              'Course recommendation and progress app — STI West Negros University capstone. Matches are calculated from your answers and profile; they are guidance, not a guarantee.',
            )
          }
        />
        <Row
          icon={LogOut}
          label="Sign out"
          danger
          onPress={() => showAlert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void signOut() }])}
        />
      </Card>
      {useEmulators && (
        <T variant="caption" color={colors.amber600} center style={{ marginTop: space.lg }}>
          Connected to the local Firebase emulator (test data).
        </T>
      )}
    </Screen>
  );
}
