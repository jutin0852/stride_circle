import { useEffect, useState } from 'react';

import { watchOnboarding } from '@/lib/onboarding';

type OnboardingState = {
  needsOnboarding: boolean;
  status: 'loading' | 'ready' | 'error';
  userId?: string;
};

export function useOnboardingState(userId: string | undefined): OnboardingState {
  const [state, setState] = useState<OnboardingState>({ needsOnboarding: false, status: userId ? 'loading' : 'ready', userId });

  useEffect(() => {
    if (!userId) {
      setState({ needsOnboarding: false, status: 'ready' });
      return;
    }

    setState({ needsOnboarding: false, status: 'loading', userId });
    return watchOnboarding(
      userId,
      (needsOnboarding) => setState({ needsOnboarding, status: 'ready', userId }),
      () => setState({ needsOnboarding: false, status: 'error', userId }),
    );
  }, [userId]);

  // Auth updates before effects run. Keep protected tabs hidden during that
  // single render rather than allowing a new account to flash the Home tab.
  if (userId && state.userId !== userId) return { needsOnboarding: false, status: 'loading' };
  return state;
}
