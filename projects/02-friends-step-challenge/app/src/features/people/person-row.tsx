import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText } from '@/components/ui';
import type { PublicProfile } from '@/domain/usernames';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { getDefaultAvatarChoice, isAvatarStyle, type AvatarChoice } from '@/lib/avatar';

export function getProfileAvatar(profile: Pick<PublicProfile, 'avatarSeed' | 'avatarStyle' | 'userId'>): AvatarChoice {
  return isAvatarStyle(profile.avatarStyle)
    ? { seed: profile.avatarSeed, style: profile.avatarStyle }
    : getDefaultAvatarChoice(profile.userId);
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
}

/** A person as search and friends lists show them: character, name and handle only. */
export function PersonRow({ actions, person }: { actions?: ReactNode; person: Pick<PublicProfile, 'avatarSeed' | 'avatarStyle' | 'displayName' | 'userId' | 'username'> }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row} testID={`person-${person.username}`}>
      <DicebearAvatar choice={getProfileAvatar(person)} fallback={getInitials(person.displayName)} size={46} />
      <View style={styles.copy}>
        <AppText numberOfLines={1} variant="label">{person.displayName}</AppText>
        <AppText numberOfLines={1} tone="tertiary" variant="caption">@{person.username}</AppText>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 72, paddingVertical: spacing.sm },
    copy: { flex: 1, gap: 2 },
    actions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  });
}
