import { useEffect, useState } from 'react';

import { watchOnboarding } from '@/lib/onboarding';

type OnboardingState = {
  needsOnboarding: boolean;
  status: 'loading' | 'ready' | 'error';
  userId?: string;
};

export function useOnboardingState(userId: string | undefined): OnboardingState {
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (!userId) return;

    // State is only set from the subscription; signed-out and loading states
    // are derived during render below.
    return watchOnboarding(
      userId,
      (needsOnboarding) => setState({ needsOnboarding, status: 'ready', userId }),
      () => setState({ needsOnboarding: false, status: 'error', userId }),
    );
  }, [userId]);

  if (!userId) return { needsOnboarding: false, status: 'ready' };
  // Until this user's first snapshot arrives (including right after an account
  // switch), keep protected tabs hidden rather than flashing the Home tab.
  if (state?.userId !== userId) return { needsOnboarding: false, status: 'loading' };
  return state;
}
