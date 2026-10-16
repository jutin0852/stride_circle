import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { AppText, Button, ProgressBar, Surface } from '@/components/ui';
import { motion, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useStepTracking } from '@/hooks/use-step-tracking';
import { WakaLogo } from '@/components/waka-logo';
import { ConfettiBurst, Hop, PopIn, PulseRings, Rise } from './onboarding-motion';
import { WelcomeHero } from './welcome-hero';
import { DEFAULT_DAILY_STEP_GOAL, DAILY_STEP_GOAL_PRESETS, saveDailyStepGoal, saveWeeklyStepGoal } from '@/lib/movement-goals';
import { type OnboardingIntent } from '@/lib/onboarding';

type OnboardingFlowProps = {
  onComplete: (destination: 'circle' | 'home', intent: OnboardingIntent) => Promise<void>;
  userId: string;
};

type Step = 'welcome' | 'intent' | 'goal' | 'health' | 'finish';

const steps: Step[] = ['welcome', 'intent', 'goal', 'health', 'finish'];

const intentOptions: Array<{ icon: keyof typeof Ionicons.glyphMap; id: OnboardingIntent; label: string; supporting: string }> = [
  { id: 'build-a-rhythm', icon: 'calendar-outline', label: 'Build a walking rhythm', supporting: 'Small, repeatable wins each day.' },
  { id: 'walk-with-friends', icon: 'people-outline', label: 'Walk with friends', supporting: 'A little company makes it easier to show up.' },
  { id: 'feel-better', icon: 'heart-outline', label: 'Feel better day to day', supporting: 'More movement, at your own pace.' },
  { id: 'see-my-progress', icon: 'trending-up-outline', label: 'See my progress', supporting: 'A clear view of every walk adding up.' },
];

export function OnboardingFlow({ onComplete, userId }: OnboardingFlowProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const health = useStepTracking();
  const [step, setStep] = useState<Step>('welcome');
  const [visibleStep, setVisibleStep] = useState<Step>('welcome');
  const [intent, setIntent] = useState<OnboardingIntent>('build-a-rhythm');
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_STEP_GOAL);
  const [savingGoals, setSavingGoals] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Held in state (created once) so render never reads a ref's current value.
  const [reveal] = useState(() => new Animated.Value(1));
  const currentIndex = steps.indexOf(step);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const transitionTo = useCallback((next: Step) => {
    setError(null);
    if (reducedMotion) { setStep(next); setVisibleStep(next); return; }
    Animated.timing(reveal, { toValue: 0, duration: motion.fast, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false }).start(() => {
      setVisibleStep(next);
      setStep(next);
      reveal.setValue(0);
      Animated.timing(reveal, { toValue: 1, duration: motion.standard, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web', isInteraction: false }).start();
    });
  }, [reducedMotion, reveal]);

  const continueFromGoals = useCallback(async () => {
    setSavingGoals(true);
    setError(null);
    try {
      // A retry is safe if only one write made it through before connectivity
      // dropped: both writes are deterministic user preferences.
      await Promise.all([
        saveDailyStepGoal({ goal: dailyGoal, userId }),
        saveWeeklyStepGoal({ goal: dailyGoal * 7, userId }),
      ]);
      transitionTo('health');
    } catch {
      setError('We could not save your goals. Check your connection and try again.');
    } finally {
      setSavingGoals(false);
    }
  }, [dailyGoal, transitionTo, userId]);

  const finish = useCallback(async (destination: 'circle' | 'home') => {
    setFinishing(true);
    setError(null);
    try {
      await onComplete(destination, intent);
    } catch {
      setError('We could not finish setup. Please try again.');
      setFinishing(false);
    }
  }, [intent, onComplete]);

  const renderStep = () => {
    switch (visibleStep) {
      case 'intent':
        return <IntentStep intent={intent} onChange={setIntent} reducedMotion={reducedMotion} styles={styles} />;
      case 'goal':
        return <GoalStep dailyGoal={dailyGoal} onChange={setDailyGoal} reducedMotion={reducedMotion} styles={styles} />;
      case 'health':
        return <HealthStep health={health} reducedMotion={reducedMotion} styles={styles} />;
      case 'finish':
        return <FinishStep intent={intent} dailyGoal={dailyGoal} healthConnected={health.status === 'tracking'} reducedMotion={reducedMotion} styles={styles} />;
    }
  };

  const next = () => {
    if (step === 'welcome') transitionTo('intent');
    else if (step === 'intent') transitionTo('goal');
    else if (step === 'goal') void continueFromGoals();
    else if (step === 'health') transitionTo('finish');
  };
  const primaryLabel = step === 'welcome' ? 'Let’s make a plan' : step === 'intent' ? 'Continue' : step === 'goal' ? 'Save my walking plan' : step === 'health' ? health.status === 'tracking' ? 'Continue' : 'Continue without connecting' : 'Find a circle';

  if (visibleStep === 'welcome') {
    // The welcome step carries on from the blue launch splash, so it has its own full-bleed layout.
    return <WelcomeHero reducedMotion={reducedMotion}><Button onPress={next}>{primaryLabel}</Button></WelcomeHero>;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.topBar}>
        {currentIndex > 0 ? <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={10} onPress={() => transitionTo(steps[currentIndex - 1])} style={styles.back}><Ionicons color={colors.contentPrimary} name="chevron-back" size={24} /></Pressable> : <View style={styles.backPlaceholder} />}
        <AppText tone="secondary" variant="label">{currentIndex + 1} OF {steps.length}</AppText>
        <View style={styles.backPlaceholder} />
      </View>
      <ProgressBar accessibilityLabel={`Onboarding progress: ${currentIndex + 1} of ${steps.length}`} animated value={currentIndex + 1} max={steps.length} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? <AppText accessibilityRole="alert" style={styles.error} tone="danger" variant="bodySmall">{error}</AppText> : null}
        {step === 'finish' ? <>
          <Button loading={finishing} onPress={() => void finish('circle')} trailing={<Ionicons color={colors.contentOnBrand} name="people" size={18} />}>{primaryLabel}</Button>
          <Button disabled={finishing} onPress={() => void finish('home')} variant="tertiary">Start at Home</Button>
        </> : <>
          {step === 'health' && health.status !== 'tracking' && health.status !== 'requesting' ? <Button onPress={() => void health.requestStepAccess()} trailing={<Ionicons color={colors.contentOnBrand} name="heart" size={18} />}>Connect my steps</Button> : null}
          <Button loading={savingGoals} disabled={step === 'health' && health.status === 'requesting'} onPress={next} variant={step === 'health' && health.status !== 'tracking' && health.status !== 'requesting' ? 'tertiary' : 'primary'}>{primaryLabel}</Button>
        </>}
      </View>
    </SafeAreaView>
  );
}

type StepStyles = ReturnType<typeof createStyles>;

function IntentStep({ intent, onChange, reducedMotion, styles }: { intent: OnboardingIntent; onChange: (intent: OnboardingIntent) => void; reducedMotion: boolean; styles: StepStyles }) {
  const { colors } = useAppTheme();
  return <View style={styles.content}>
    <Rise reducedMotion={reducedMotion}>
      <AppText style={styles.eyebrow} tone="link" variant="label">MAKE IT YOURS</AppText>
      <AppText style={styles.title} variant="headline">What would feel like a win?</AppText>
    </Rise>
    <Rise delay={80} reducedMotion={reducedMotion}><AppText style={styles.description} tone="secondary" variant="body">Choose the reason you want to make more room for walking. You can always change your rhythm later.</AppText></Rise>
    <View style={styles.options}>{intentOptions.map((option, index) => {
      const selected = intent === option.id;
      return <Rise delay={140 + index * 70} key={option.id} reducedMotion={reducedMotion}>
        <PressableScale accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onChange(option.id)} style={[styles.option, selected && styles.optionSelected]}>
          <View style={[styles.optionIcon, selected && { backgroundColor: colors.brandActionSoft }]}><Ionicons color={selected ? colors.contentLink : colors.contentSecondary} name={option.icon} size={21} /></View>
          <View style={styles.optionCopy}><AppText variant="bodyStrong">{option.label}</AppText><AppText tone="secondary" variant="bodySmall">{option.supporting}</AppText></View>
          {selected
            ? <PopIn key="on" reducedMotion={reducedMotion}><Ionicons color={colors.contentLink} name="checkmark-circle" size={24} /></PopIn>
            : <Ionicons color={colors.contentTertiary} name="radio-button-off" size={22} />}
        </PressableScale>
      </Rise>;
    })}</View>
  </View>;
}

function GoalStep({ dailyGoal, onChange, reducedMotion, styles }: { dailyGoal: number; onChange: (goal: number) => void; reducedMotion: boolean; styles: StepStyles }) {
  return <View style={styles.content}>
    <Rise reducedMotion={reducedMotion}>
      <AppText style={styles.eyebrow} tone="link" variant="label">YOUR WALKING PLAN</AppText>
      <AppText style={styles.title} variant="headline">Pick a kind daily goal.</AppText>
    </Rise>
    <Rise delay={80} reducedMotion={reducedMotion}><AppText style={styles.description} tone="secondary" variant="body">A goal is a gentle nudge, not a test. Start where today-you can succeed.</AppText></Rise>
    <PopIn delay={140} reducedMotion={reducedMotion}>
      <Surface style={styles.goalHighlight} variant="soft">
        <AppText tone="secondary" variant="label">DAILY TARGET</AppText>
        {/* Keyed on the goal so the number pops each time it changes. */}
        <PopIn key={dailyGoal} reducedMotion={reducedMotion}><AppText style={styles.goalNumber} variant="displaySmall">{dailyGoal.toLocaleString('en-US')}</AppText></PopIn>
        <AppText tone="secondary" variant="bodySmall">steps a day · {Math.round(dailyGoal * 7 / 1000)}k steps a week</AppText>
      </Surface>
    </PopIn>
    <View style={styles.goalChoices}>{DAILY_STEP_GOAL_PRESETS.map((goal, index) => <Rise delay={220 + index * 50} key={goal} reducedMotion={reducedMotion} style={styles.goalChoiceCell}>
      <PressableScale accessibilityRole="radio" accessibilityState={{ selected: goal === dailyGoal }} onPress={() => onChange(goal)} style={[styles.goalChoice, goal === dailyGoal && styles.goalChoiceSelected]}><AppText tone={goal === dailyGoal ? 'link' : 'primary'} variant="titleSmall">{goal.toLocaleString('en-US')}</AppText><AppText tone="secondary" variant="caption">steps</AppText></PressableScale>
    </Rise>)}</View>
  </View>;
}

function HealthStep({ health, reducedMotion, styles }: { health: ReturnType<typeof useStepTracking>; reducedMotion: boolean; styles: StepStyles }) {
  const { colors } = useAppTheme();
  const connected = health.status === 'tracking';
  const busy = health.status === 'checking' || health.status === 'requesting';
  const unavailable = health.status === 'unavailable';
  return <View style={styles.content}>
    <Rise reducedMotion={reducedMotion}>
      <AppText style={styles.eyebrow} tone="link" variant="label">OPTIONAL, BUT HELPFUL</AppText>
      <AppText style={styles.title} variant="headline">Bring your steps with you.</AppText>
    </Rise>
    <Rise delay={80} reducedMotion={reducedMotion}><AppText style={styles.description} tone="secondary" variant="body">Wakà reads your daily step total from your phone’s health service. It never needs your location to count your walking day.</AppText></Rise>
    <Rise delay={160} reducedMotion={reducedMotion}>
      <Surface style={styles.healthCard} variant={connected ? 'soft' : 'outline'}>
        <View style={styles.healthIcon}>
          {!connected ? <PulseRings color={colors.borderStrong} reducedMotion={reducedMotion} size={52} /> : null}
          <PopIn key={connected ? 'connected' : 'waiting'} reducedMotion={reducedMotion}><Ionicons color={connected ? colors.successContent : colors.contentLink} name={connected ? 'checkmark-circle' : 'walk'} size={30} /></PopIn>
        </View>
        <View style={styles.healthCopy}><AppText variant="titleSmall">{connected ? 'Steps connected' : unavailable ? 'Health data is unavailable here' : 'Your daily total, privately'}</AppText><AppText tone="secondary" variant="bodySmall">{connected ? 'Your walking progress can now update from your health data.' : unavailable ? 'You can still explore the app and connect from a supported phone later.' : 'You stay in control of what you share through your device settings.'}</AppText></View>
        {busy ? <ActivityIndicator color={colors.contentLink} /> : null}
      </Surface>
    </Rise>
    <Rise delay={240} reducedMotion={reducedMotion}><View style={styles.trustNote}><Ionicons color={colors.contentSecondary} name="shield-checkmark-outline" size={18} /><AppText style={styles.trustCopy} tone="secondary" variant="bodySmall">You can change this any time in your phone’s health permissions.</AppText></View></Rise>
  </View>;
}

function FinishStep({ dailyGoal, healthConnected, intent, reducedMotion, styles }: { dailyGoal: number; healthConnected: boolean; intent: OnboardingIntent; reducedMotion: boolean; styles: StepStyles }) {
  const { colors } = useAppTheme();
  const intentCopy = intentOptions.find(option => option.id === intent)?.label.toLowerCase() ?? 'walk more';
  return <View style={styles.welcome}>
    <View style={styles.finishStage}>
      <ConfettiBurst reducedMotion={reducedMotion} />
      <PopIn reducedMotion={reducedMotion}><Hop reducedMotion={reducedMotion}>
        <View style={[styles.finishBadge, { backgroundColor: colors.brandAction, borderColor: colors.canvas, shadowColor: colors.brandActionPressed }]}><WakaLogo color="#FFFFFF" width={88} /></View>
      </Hop></PopIn>
    </View>
    <Rise delay={200} reducedMotion={reducedMotion}><AppText style={styles.eyebrow} tone="link" variant="label">YOUR FIRST WIN</AppText></Rise>
    <Rise delay={260} reducedMotion={reducedMotion}><AppText style={styles.heroTitle} variant="displaySmall">You’re ready to {intentCopy}.</AppText></Rise>
    <Rise delay={340} reducedMotion={reducedMotion}><AppText style={styles.heroCopy} tone="secondary" variant="body">Your {dailyGoal.toLocaleString('en-US')}-step daily goal is set{healthConnected ? ', and your health data is connected' : ''}. Find a circle when you’re ready for a little shared momentum.</AppText></Rise>
  </View>;
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1 },
    topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
    backPlaceholder: { width: 44 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    footer: { backgroundColor: colors.canvas, borderTopColor: colors.borderSubtle, borderTopWidth: 1, gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
    welcome: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: spacing.xl },
    eyebrow: { letterSpacing: 1.25, textAlign: 'center' },
    heroTitle: { marginTop: spacing.md, textAlign: 'center' },
    heroCopy: { marginTop: spacing.lg, maxWidth: 340, textAlign: 'center' },
    content: { gap: spacing.md },
    title: { marginTop: spacing.xs },
    description: { marginBottom: spacing.sm },
    options: { gap: spacing.sm },
    option: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 80, padding: spacing.md },
    optionSelected: { backgroundColor: colors.infoSurface, borderColor: colors.borderSelected, borderWidth: 2, padding: 11 },
    
    optionIcon: { alignItems: 'center', backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm, height: 40, justifyContent: 'center', width: 40 },
    optionCopy: { flex: 1, gap: 2 },
    goalHighlight: { alignItems: 'center', gap: spacing.xs, marginVertical: spacing.md },
    goalNumber: { color: colors.contentLink },
    goalChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    goalChoiceCell: { width: '30.8%' },
    goalChoice: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: 2, paddingVertical: spacing.md },
    goalChoiceSelected: { backgroundColor: colors.infoSurface, borderColor: colors.borderSelected, borderWidth: 2, paddingVertical: 11 },
    healthCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    finishStage: { alignItems: 'center', height: 200, justifyContent: 'center', marginBottom: spacing.xl, width: '100%' },
    finishBadge: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 6, elevation: 6, height: 140, justifyContent: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 0, width: 140 },
    healthIcon: { alignItems: 'center', backgroundColor: colors.infoSurface, borderRadius: radii.pill, height: 52, justifyContent: 'center', width: 52 },
    healthCopy: { flex: 1, gap: 4 },
    trustNote: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    trustCopy: { flex: 1 },
    error: { textAlign: 'center' },
  });
}
