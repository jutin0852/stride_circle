import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, FixedHeaderScreen } from '@/components/ui';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, updateUserAvatar } from '@/lib/auth';
import { avatarGroups, avatarStyles, type AvatarChoice } from '@/lib/avatar';
import { useAppColors } from '@/design-system/use-app-theme';

export default function ProfileCharacterRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const displayName = profile.displayName;
  const current = profile.avatar;
  const seed = current.seed;
  const groupedStyles = avatarGroups.flatMap((group) => group.styles);
  const [savingStyle, setSavingStyle] = useState<string | null>(null);

  async function selectCharacter(style: AvatarChoice['style']) {
    if (!user || savingStyle) return;
    if (returnTo === 'edit-profile') {
      router.dismissTo({ pathname: '/edit-profile', params: { characterStyle: style } });
      return;
    }
    setSavingStyle(style);
    try {
      await updateUserAvatar({ avatar: { seed, style }, user });
      router.back();
    } catch (error) {
      Alert.alert('Could not update character', getAuthErrorMessage(error));
    } finally {
      setSavingStyle(null);
    }
  }

  return (
    <FixedHeaderScreen backgroundColor={colors.background} header={<View style={styles.header}><View><AppText style={styles.title}>Choose a character</AppText><AppText style={styles.subtitle}>Pick one that feels like you.</AppText></View><DicebearAvatar choice={{ seed, style: current.style }} fallback={getInitials(displayName)} size={58} /></View>} headerStyle={styles.fixedHeader} contentContainerStyle={styles.content}>
      {avatarGroups.map((group) => <View key={group.title} style={styles.group}><AppText style={styles.groupTitle}>{group.title}</AppText><View style={styles.grid}>{group.styles.map((style) => {
        const isCurrent = !current.photoURL && current.style === style && current.seed === seed;
        return <PressableScale accessibilityLabel="Choose character" accessibilityRole="button" disabled={savingStyle !== null} key={style} onPress={() => void selectCharacter(style)} style={[styles.option, isCurrent && styles.optionCurrent]}>
          {savingStyle === style ? <View style={styles.avatarLoading}><ActivityIndicator color={colors.accent} /></View> : <DicebearAvatar choice={{ seed, style }} fallback={getInitials(displayName)} size={56} />}
        </PressableScale>;
      })}</View></View>)}
      {groupedStyles.length === avatarStyles.length ? null : <AppText style={styles.error}>Some characters are unavailable right now.</AppText>}
    </FixedHeaderScreen>
  );
}

function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC'; }

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  fixedHeader: { paddingHorizontal: 22, paddingVertical: 12 }, content: { gap: 20, padding: 22, paddingTop: 8, paddingBottom: 40 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.9 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 }, group: { gap: 10 }, groupTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, option: { alignItems: 'center', borderBottomWidth: 3, borderColor: colors.border, borderRadius: 16, borderWidth: 2, padding: 6, width: '23%' }, optionCurrent: { backgroundColor: colors.soft, borderColor: colors.accent, borderWidth: 2, padding: 6 }, avatarLoading: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, error: { color: colors.dangerContent, fontSize: 13 },
}); }
