import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { getAvatarUrl, getProfilePhotoURL, type AvatarChoice } from '@/lib/avatar';
import { useAppColors } from '@/design-system/use-app-theme';

export function DicebearAvatar({ choice, fallback, size = 44 }: { choice: AvatarChoice; fallback: string; size?: number }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = getAvatarUrl(choice);

  return (
    <View style={[styles.frame, { borderRadius: size / 2, height: size, width: size }]}>
      {failedUri === uri ? <Text style={[styles.fallback, { fontSize: size * 0.3 }]}>{fallback}</Text>
        : getProfilePhotoURL(choice.photoURL)
          ? <Image key={uri} accessibilityLabel={`${fallback} profile picture`} onError={() => setFailedUri(uri)} resizeMode="cover" source={{ uri }} style={{ height: size, width: size }} />
          : <SvgUri key={uri} height={size} onError={() => setFailedUri(uri)} uri={uri} width={size} />}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  frame: { alignItems: 'center', backgroundColor: colors.soft, justifyContent: 'center', overflow: 'hidden' },
  fallback: { color: colors.accentPressed, fontWeight: '800' },
}); }
