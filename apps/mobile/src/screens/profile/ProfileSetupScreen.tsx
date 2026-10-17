import {
  CAREER_INTEREST_OPTIONS,
  EXPERIENCE_OPTIONS,
  LEARNING_GOALS_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  PARENTAL_INCOME_OPTIONS,
  RESIDENCE_TYPE_OPTIONS,
  SHS_STRANDS,
  SKILL_LEVEL_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  type StudentProfile,
} from '@wisepath/shared';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Camera, Check, Lock } from 'lucide-react-native';
import * as React from 'react';
import { Alert, KeyboardAvoidingView, View } from 'react-native';
import { Avatar } from '../../components/brand';
import { Button, Chip, ErrorBanner, Field, Header, ProgressBar, Screen, T, Tap } from '../../components/ui';
import { db } from '../../lib/firebase';
import { errorText } from '../../lib/hooks';
import { savePhoto, saveProfile, signOut } from '../../services';
import { useStudent } from '../../stores/session';
import { colors, radius, space } from '../../theme';

const STEPS = ['About you', 'Background', 'Interests', 'Goals', 'Learning', 'Photo'] as const;

const defaults = (name: string, existing?: StudentProfile): StudentProfile => ({
  name: existing?.name ?? name,
  studentStatus: existing?.studentStatus ?? 'incoming',
  shsStrand: existing?.shsStrand ?? 'STEM',
  academicAverage: existing?.academicAverage ?? '',
  residenceType: existing?.residenceType ?? 'urban',
  parentalIncomeLevel: existing?.parentalIncomeLevel ?? 'prefer_not_to_say',
  careerInterests: existing?.careerInterests ?? [],
  learningGoals: Array.isArray(existing?.learningGoals) ? existing!.learningGoals : [],
  currentSkills: existing?.currentSkills ?? 'Beginner',
  learningStyle: existing?.learningStyle ?? 'Mixed',
  experience: existing?.experience ?? 'No Experience',
});

function ChoiceGroup<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

function MultiGroup({ options, value, onChange, max }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const selected = value.includes(o);
        return (
          <Tap
            key={o}
            onPress={() => onChange(selected ? value.filter((x) => x !== o) : max && value.length >= max ? value : [...value, o])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: selected ? colors.navy900 : colors.white,
              borderWidth: 1,
              borderColor: selected ? colors.navy900 : colors.line,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: selected ? colors.gold500 : colors.lineStrong,
                backgroundColor: selected ? colors.gold500 : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected && <Check size={14} color={colors.white} strokeWidth={3} />}
            </View>
            <T variant="bodySm" weight={selected ? 'semibold' : 'medium'} color={selected ? colors.white : colors.navy900} style={{ flex: 1 }}>
              {o}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginBottom: space.xxl }}>
      <View>
        <T variant="h3">{title}</T>
        {hint && (
          <T variant="bodySm" color={colors.textMuted}>
            {hint}
          </T>
        )}
      </View>
      {children}
    </View>
  );
}

/** Six short steps. First run (root gate) or "Edit profile" (stack screen). */
export function ProfileSetupScreen() {
  const navigation = useNavigation();
  const { uid, account } = useStudent();
  const editing = Boolean(account?.profileComplete);
  const [profile, setProfile] = React.useState<StudentProfile>(() => defaults(account?.displayName ?? '', account?.profile));
  const [step, setStep] = React.useState(0);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid || !account?.hasPhoto) return;
    void getDoc(doc(db, 'userPhotos', uid)).then((snap) => setPhoto((snap.get('dataUri') as string) ?? null)).catch(() => undefined);
  }, [uid, account?.hasPhoto]);

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const stepError = (): string | null => {
    if (step === 0 && profile.name.trim().length < 2) return 'Enter your full name.';
    if (step === 2 && !profile.careerInterests.length) return 'Pick at least one career interest.';
    if (step === 3 && !profile.learningGoals.length) return 'Pick at least one learning goal.';
    return null;
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo access needed', 'Allow photo access to set your profile picture.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const resized = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 320 } }], {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!resized.base64) return Alert.alert('Could not read photo', 'Try another image.');
    setPhoto(`data:image/jpeg;base64,${resized.base64}`);
    setPhotoChanged(true);
  };

  const next = async () => {
    const problem = stepError();
    if (problem) return setError(problem);
    setError(null);
    if (step < STEPS.length - 1) return setStep(step + 1);
    setBusy(true);
    try {
      await saveProfile(uid, { ...profile, name: profile.name.trim().replace(/\s+/g, ' ') });
      if (photoChanged) await savePhoto(uid, photo);
      if (editing && navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
    else if (editing && navigation.canGoBack()) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Screen
        header={
          <View>
            <Header
              title={editing ? 'Edit profile' : 'Set up your profile'}
              subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
              back={editing}
              right={
                !editing ? (
                  <Tap onPress={() => void signOut()} style={{ padding: 8 }}>
                    <T variant="bodySm" weight="semibold" color={colors.textMuted}>
                      Sign out
                    </T>
                  </Tap>
                ) : undefined
              }
            />
            <View style={{ paddingHorizontal: space.xl, paddingBottom: space.sm }}>
              <ProgressBar value={((step + 1) / STEPS.length) * 100} color={colors.gold500} height={6} />
            </View>
          </View>
        }
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(step > 0 || editing) && <Button title="Back" icon={ArrowLeft} variant="outline" onPress={back} style={{ flex: 1 }} />}
            <Button
              title={step === STEPS.length - 1 ? (editing ? 'Save profile' : 'Finish') : 'Next'}
              iconRight={step === STEPS.length - 1 ? Check : ArrowRight}
              variant={step === STEPS.length - 1 ? 'gold' : 'primary'}
              onPress={() => void next()}
              loading={busy}
              style={{ flex: 2 }}
            />
          </View>
        }
      >
        {error && (
          <View style={{ marginBottom: space.lg }}>
            <ErrorBanner message={error} />
          </View>
        )}

        {step === 0 && (
          <>
            <Question title="What’s your name?">
              <Field label="Full name" value={profile.name} onChangeText={(v) => set('name', v)} autoComplete="name" />
            </Question>
            <Question title="Where are you in your studies?">
              <ChoiceGroup options={STUDENT_STATUS_OPTIONS} value={profile.studentStatus} onChange={(v) => set('studentStatus', v)} />
            </Question>
            <Question title="General average (optional)" hint="e.g. 88 or 1.75">
              <Field label="Academic average" value={profile.academicAverage ?? ''} onChangeText={(v) => set('academicAverage', v)} keyboardType="decimal-pad" />
            </Question>
            <Question title="Where do you live?">
              <ChoiceGroup options={RESIDENCE_TYPE_OPTIONS} value={profile.residenceType} onChange={(v) => set('residenceType', v)} />
            </Question>
          </>
        )}

        {step === 1 && (
          <>
            <Question title="Your senior high school strand">
              <ChoiceGroup options={SHS_STRANDS.map((s) => ({ value: s, label: s }))} value={profile.shsStrand} onChange={(v) => set('shsStrand', v)} />
            </Question>
            <Question title="Monthly family income (optional)" hint="Used only to favor programs that may be more affordable for you.">
              <ChoiceGroup options={PARENTAL_INCOME_OPTIONS} value={profile.parentalIncomeLevel} onChange={(v) => set('parentalIncomeLevel', v)} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <Lock size={14} color={colors.textMuted} />
                <T variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
                  Private: department admins never see your income — only whether affordability was considered.
                </T>
              </View>
            </Question>
          </>
        )}

        {step === 2 && (
          <Question title="Which careers interest you?" hint="Pick all that apply.">
            <MultiGroup options={CAREER_INTEREST_OPTIONS} value={profile.careerInterests} onChange={(v) => set('careerInterests', v)} />
          </Question>
        )}

        {step === 3 && (
          <Question title="What do you want from college?" hint="Pick all that apply.">
            <MultiGroup options={LEARNING_GOALS_OPTIONS} value={profile.learningGoals} onChange={(v) => set('learningGoals', v)} />
          </Question>
        )}

        {step === 4 && (
          <>
            <Question title="Your current skill level">
              <ChoiceGroup options={SKILL_LEVEL_OPTIONS.map((s) => ({ value: s, label: s }))} value={profile.currentSkills} onChange={(v) => set('currentSkills', v)} />
            </Question>
            <Question title="How do you learn best?">
              <ChoiceGroup options={LEARNING_STYLE_OPTIONS.map((s) => ({ value: s, label: s }))} value={profile.learningStyle} onChange={(v) => set('learningStyle', v)} />
            </Question>
            <Question title="Work or training experience">
              <ChoiceGroup
                options={EXPERIENCE_OPTIONS.map((s) => ({ value: s, label: s }))}
                value={profile.experience as (typeof EXPERIENCE_OPTIONS)[number]}
                onChange={(v) => set('experience', v)}
              />
            </Question>
          </>
        )}

        {step === 5 && (
          <View style={{ alignItems: 'center', gap: space.lg, marginTop: space.xl }}>
            <Tap onPress={() => void pickPhoto()} accessibilityRole="button" accessibilityLabel="Choose profile photo">
              <Avatar name={profile.name} uri={photo} size={120} />
              <View style={{ position: 'absolute', right: -6, bottom: -6, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold700, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.parchment }}>
                <Camera size={18} color={colors.white} />
              </View>
            </Tap>
            <T variant="h3">Add a profile photo (optional)</T>
            <T variant="bodySm" color={colors.textMuted} center>
              Tap the picture to choose a square photo. You can skip this and add one later.
            </T>
            {photo && (
              <Button
                title="Remove photo"
                variant="ghost"
                small
                onPress={() => {
                  setPhoto(null);
                  setPhotoChanged(true);
                }}
              />
            )}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
