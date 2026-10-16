import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/design-system/use-app-theme';
import { spacing, opacity } from '@/design-system/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';


export function DiscoverSearch({ visible, value, onChange }: { visible: boolean; value: string; onChange: (value: string) => void }) {
  const colors = useAppColors();
  const reducedMotion = useReducedMotion();
  const input = useRef<TextInput>(null);
  const [mounted, setMounted] = useState(visible);
  const [reveal] = useState(() => new Animated.Value(0));
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    reveal.stopAnimation();
    if (!mounted) return;
    if (visible) input.current?.focus();
    else input.current?.blur();
    const animation = Animated.timing(reveal, {
      toValue: visible ? 1 : 0, duration: reducedMotion ? 0 : visible ? 180 : 120,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    animation.start(({ finished }) => { if (finished && !visible) setMounted(false); });
    return () => animation.stop();
  }, [mounted, reducedMotion, reveal, visible]);

  if (!mounted && !visible) return null;
  return <Animated.View testID="discover-search-reveal" pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible}
    importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    style={{ opacity: reveal, transform: [{ translateY: reducedMotion ? 0 : reveal.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>
    <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons color={colors.muted} name="search" size={19} />
      <TextInput ref={input} accessibilityLabel="Search public Circles" autoCapitalize="none" autoCorrect={false} autoFocus
        editable={visible} onChangeText={onChange} placeholder="Search by circle or area" placeholderTextColor={colors.placeholder}
        returnKeyType="search" style={[styles.input, { color: colors.ink }]} value={value} />
      {value ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" disabled={!visible}
        onPress={() => { onChange(''); input.current?.focus(); }} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
        <Ionicons color={colors.muted} name="close-circle" size={19} />
      </Pressable> : null}
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, height: 48, marginTop: spacing.sm, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 0 },
  clear: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: 44, marginRight: -10 },
  pressed: { opacity: opacity.pressed },
});
