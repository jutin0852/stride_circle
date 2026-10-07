import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { getAvatarUrl, type AvatarChoice } from '@/lib/avatar';
import { useAppColors } from '@/design-system/use-app-theme';

export function DicebearAvatar({ choice, fallback, size = 44 }: { choice: AvatarChoice; fallback: string; size?: number }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.frame, { borderRadius: size / 2, height: size, width: size }]}>
      {failed ? <Text style={[styles.fallback, { fontSize: size * 0.3 }]}>{fallback}</Text> : <SvgUri height={size} onError={() => setFailed(true)} uri={getAvatarUrl(choice)} width={size} />}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  frame: { alignItems: 'center', backgroundColor: colors.soft, justifyContent: 'center', overflow: 'hidden' },
  fallback: { color: colors.accentPressed, fontWeight: '800' },
}); }
