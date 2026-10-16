import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { AnimatedAppSplash } from '@/components/animated-app-splash';
import { useReducedMotionSetting } from '@/hooks/use-reduced-motion';

/** Replays the real animation without reading or changing the daily launch marker. */
export default function SplashPreviewRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const reducedMotion = useReducedMotionSetting();
  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, []);

  if (!__DEV__) return <Redirect href="/profile" />;

  return <AnimatedAppSplash mode={mode === 'short' ? 'short' : 'full'} onFinished={finish} reducedMotion={reducedMotion} />;
}
