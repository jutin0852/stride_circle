import { Redirect } from 'expo-router';
import { opacity } from '@/design-system/tokens';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { useAuth } from '@/auth/auth-provider';
import { GoogleMark } from '@/components/google-mark';
import { BrandLogo } from '@/components/brand-logo';
import { Button, FixedHeaderScreen } from '@/components/ui';
import { createAccount, getAuthErrorMessage, signInWithEmail } from '@/lib/auth';
import { signInWithGoogle } from '@/services/auth/google-sign-in';
import { useAppColors } from '@/design-system/use-app-theme';


type Mode = 'sign-in' | 'sign-up';
type Field = 'displayName' | 'email' | 'password';

export default function SignInRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isConfigured, isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<Field | null>(null);
  const submissionLock = useRef(false);

  if (isLoading) {
    return <View style={styles.loadingPage}><BrandLogo size={80} /><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Opening Wakà</Text></View>;
  }
  if (user) return <Redirect href="/" />;

  function showFirebaseConfigurationAlert() {
    Alert.alert('Firebase configuration required', 'Configure Firebase before continuing.');
  }

  async function handleGooglePress() {
    if (!isConfigured) {
      showFirebaseConfigurationAlert();
      return;
    }

    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    try { await signInWithGoogle(); }
    catch (error) { setErrorMessage(getAuthErrorMessage(error)); }
    finally { submissionLock.current = false; setIsSubmitting(false); }
  }

  async function handleEmailSubmit() {
    if (!isConfigured) {
      showFirebaseConfigurationAlert();
      return;
    }

    if (!email.trim() || !password || (mode === 'sign-up' && !displayName.trim())) {
      setErrorMessage(mode === 'sign-up' ? 'Enter your name, email, and password.' : 'Enter your email and password.');
      return;
    }

    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'sign-up') {
        await createAccount({ displayName, email, password });
      } else {
        await signInWithEmail({ email, password });
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding' })} style={styles.page}>
      <FixedHeaderScreen backgroundColor={colors.background} header={<View style={styles.signInHeader}>
        <View style={styles.brand}>
          <BrandLogo size={48} />
          <Text style={styles.brandName}>Wakà</Text>
        </View>
        <View style={styles.intro}>
          <Text style={styles.title}>{mode === 'sign-up' ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>{mode === 'sign-up' ? 'Join friends and make every walk count.' : 'Your circle is waiting for you.'}</Text>
        </View>
      </View>} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>

        <PressableScale accessibilityRole="button" accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }} disabled={isSubmitting} onPress={() => void handleGooglePress()} style={[styles.googleButton, isSubmitting && styles.disabledButton]}><View style={styles.googleIcon}><GoogleMark /></View><Text style={styles.googleText}>{mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}</Text></PressableScale>

        <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine} /></View>

        <View style={styles.form}>
          {mode === 'sign-up' && <View style={styles.field}><Text style={styles.fieldLabel}>Name</Text><TextInput accessibilityLabel="Your name" autoCapitalize="words" editable={!isSubmitting} onBlur={() => setFocusedField(null)} onChangeText={setDisplayName} onFocus={() => setFocusedField('displayName')} style={[styles.input, focusedField === 'displayName' && styles.inputFocused]} value={displayName} /></View>}
          <View style={styles.field}><Text style={styles.fieldLabel}>Email</Text><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" editable={!isSubmitting} inputMode="email" keyboardType="email-address" onBlur={() => setFocusedField(null)} onChangeText={setEmail} onFocus={() => setFocusedField('email')} style={[styles.input, focusedField === 'email' && styles.inputFocused]} value={email} /></View>
          <View style={styles.passwordField}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput accessibilityLabel="Password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} editable={!isSubmitting} inputMode="text" onBlur={() => setFocusedField(null)} onChangeText={setPassword} onFocus={() => setFocusedField('password')} secureTextEntry={!showPassword} style={styles.passwordInput} value={password} />
              <Pressable accessibilityRole="button" onPress={() => setShowPassword(!showPassword)} style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
              </Pressable>
            </View>
          </View>
          {errorMessage && <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text>}
          <Button accessibilityLabel={isSubmitting ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'} loading={isSubmitting} onPress={() => void handleEmailSubmit()} style={{ marginTop: 8 }}>{mode === 'sign-up' ? 'Create account' : 'Sign in'}</Button>
        </View>

        {mode === 'sign-up' && <Text style={styles.legal}>By continuing, you agree to the Wakà Terms of Service and Privacy Policy.</Text>}
        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => { setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'); setErrorMessage(null); }} style={({ pressed }) => [styles.modeButton, pressed && styles.modeButtonPressed]}><Text style={styles.modeText}>{mode === 'sign-up' ? 'Already have an account? Sign in' : 'New to Wakà? Create an account'}</Text></Pressable>
      </FixedHeaderScreen>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  loadingPage: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 14, justifyContent: 'center' },
  loadingMark: { alignItems: 'center', backgroundColor: colors.hero, borderColor: colors.brandActionPressed, borderRadius: 18, borderWidth: 2, height: 58, justifyContent: 'center', width: 58 },
  loadingText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  signInHeader: { gap: 0, paddingHorizontal: 28, paddingTop: 24 },
  content: { gap: 22, paddingHorizontal: 28, paddingTop: 22 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandMark: { alignItems: 'center', backgroundColor: colors.accent, borderColor: colors.brandActionPressed, borderRadius: 10, borderWidth: 2, height: 30, justifyContent: 'center', width: 30 }, brandMarkText: { color: colors.onAccent, fontSize: 11, fontWeight: '900', letterSpacing: -0.4 }, brandName: { color: colors.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  intro: { gap: 9, marginTop: 58 },
  title: { color: colors.ink, fontSize: 39, fontWeight: '900', letterSpacing: -1.8, lineHeight: 43 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 16 }, dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 }, dividerText: { color: colors.muted, fontSize: 13 },
  form: { gap: 12 }, field: { gap: 9 }, fieldLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 58, paddingHorizontal: 16 }, inputFocused: { borderColor: colors.accentPressed, borderWidth: 2 },
  passwordField: { gap: 9 }, passwordInputWrapper: { position: 'relative' }, passwordInput: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 58, paddingHorizontal: 16, paddingRight: 42 }, passwordToggle: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -11 }], alignItems: 'center', justifyContent: 'center' }, passwordTogglePressed: { opacity: opacity.pressed },
  disabledButton: { opacity: 0.48 }, error: { color: colors.dangerContent, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  googleButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 58, position: 'relative' }, googleIcon: { left: 18, position: 'absolute' }, googleText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  
  legal: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2, textAlign: 'center' },
  modeButton: { alignItems: 'center', marginTop: 2, padding: 11 }, modeButtonPressed: { opacity: opacity.pressed }, modeText: { color: colors.accentPressed, fontSize: 14, fontWeight: '800' },
}); }
