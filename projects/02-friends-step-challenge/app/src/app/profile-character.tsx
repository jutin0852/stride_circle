import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, updateUserAvatar } from '@/lib/auth';
import { avatarGroups, avatarStyles, type AvatarChoice } from '@/lib/avatar';
import { colors } from '@/theme';

export default function ProfileCharacterRoute() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const displayName = profile.displayName;
  const current = profile.avatar;
  const seed = current.seed;
  const groupedStyles = avatarGroups.flatMap((group) => group.styles);
  const [savingStyle, setSavingStyle] = useState<string | null>(null);

  async function selectCharacter(style: AvatarChoice['style']) {
    if (!user || savingStyle) return;
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.header}><View><Text style={styles.title}>Choose a character</Text><Text style={styles.subtitle}>Pick one that feels like you.</Text></View><DicebearAvatar choice={{ seed, style: current.style }} fallback={getInitials(displayName)} size={58} /></View>
      {avatarGroups.map((group) => <View key={group.title} style={styles.group}><Text style={styles.groupTitle}>{group.title}</Text><View style={styles.grid}>{group.styles.map((style) => {
        const isCurrent = current.style === style && current.seed === seed;
        return <Pressable accessibilityLabel="Choose character" accessibilityRole="button" disabled={savingStyle !== null} key={style} onPress={() => void selectCharacter(style)} style={({ pressed }) => [styles.option, isCurrent && styles.optionCurrent, pressed && savingStyle === null && styles.pressed]}>
          {savingStyle === style ? <View style={styles.avatarLoading}><ActivityIndicator color={colors.accent} /></View> : <DicebearAvatar choice={{ seed, style }} fallback={getInitials(displayName)} size={56} />}
        </Pressable>;
      })}</View></View>)}
      {groupedStyles.length === avatarStyles.length ? null : <Text style={styles.error}>Some characters are unavailable right now.</Text>}
    </ScrollView>
  );
}

function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 20, padding: 22, paddingBottom: 40 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.9 }, subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 }, group: { gap: 10 }, groupTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, option: { alignItems: 'center', borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 7, width: '23%' }, optionCurrent: { backgroundColor: '#EAF0FF', borderColor: colors.accent, borderWidth: 2, padding: 6 }, avatarLoading: { alignItems: 'center', backgroundColor: '#E8F0FF', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, error: { color: '#B42318', fontSize: 13 }, pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
});
