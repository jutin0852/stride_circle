import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FixedHeaderScreenProps = {
  backgroundColor: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header: ReactNode;
  headerStyle?: StyleProp<ViewStyle>;
  scrollableBody?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'showsVerticalScrollIndicator' | 'style'>;
  scrollKey?: string | number;
  safeAreaTop?: boolean;
};

export function FixedHeaderScreen({
  backgroundColor,
  children,
  contentContainerStyle,
  containerStyle,
  header,
  headerStyle,
  scrollableBody,
  safeAreaTop = true,
  scrollKey,
  scrollStyle,
  scrollViewProps,
}: FixedHeaderScreenProps) {
  const headerContent = <View style={[styles.header, { backgroundColor }, headerStyle]}>{header}</View>;

  return (
    <View style={[styles.container, { backgroundColor }, containerStyle]}>
      {safeAreaTop ? <SafeAreaView edges={['top']} style={{ backgroundColor }}>{headerContent}</SafeAreaView> : headerContent}
      {scrollableBody ?? (
        <ScrollView
          key={scrollKey}
          contentInsetAdjustmentBehavior="never"
          {...scrollViewProps}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          style={[styles.scroll, { backgroundColor }, scrollStyle]}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  scroll: { flex: 1 },
});
