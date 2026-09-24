import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { GoogleMark } from '@/components/google-mark';
import { createAccount, getAuthErrorMessage, signInWithEmail, signInWithGoogleIdToken } from '@/lib/auth';
import { colors } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'sign-in' | 'sign-up';
type Field = 'displayName' | 'email' | 'password';

export default function SignInRoute() {
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

  const googleReady = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      && process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      && process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  );
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'not-configured',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'not-configured',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'not-configured',
    selectAccount: true,
  });

  useEffect(() => {
    const idToken = googleResponse?.type === 'success' ? googleResponse.params.id_token : undefined;
    if (!idToken) return;

    async function completeGoogleSignIn() {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await signInWithGoogleIdToken(idToken!);
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    }

    void completeGoogleSignIn();
  }, [googleResponse]);

  if (isLoading) {
    return <View style={styles.loadingPage}><View style={styles.loadingMark}><Text style={styles.brandMarkText}>SC</Text></View><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Opening Stride Circle</Text></View>;
  }
  if (user) return <Redirect href="/" />;

  function showFirebaseConfigurationAlert() {
    Alert.alert('Firebase configuration required', 'Configure Firebase before continuing.');
  }

  function handleGooglePress() {
    if (!isConfigured) {
      showFirebaseConfigurationAlert();
      return;
    }

    if (!googleReady) {
      Alert.alert('Google sign-in unavailable', 'Configure Google OAuth before continuing.');
      return;
    }

    void promptGoogle();
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
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding' })} style={styles.page}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>SC</Text></View>
          <Text style={styles.brandName}>Stride Circle</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>{mode === 'sign-up' ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>{mode === 'sign-up' ? 'Join friends and make every walk count.' : 'Your circle is waiting for you.'}</Text>
        </View>

        <Pressable accessibilityRole="button" disabled={!googleRequest || isSubmitting} onPress={handleGooglePress} style={({ pressed }) => [styles.googleButton, (!googleRequest || isSubmitting) && styles.disabledButton, pressed && !isSubmitting && styles.buttonPressed]}><View style={styles.googleIcon}><GoogleMark /></View><Text style={styles.googleText}>{mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}</Text></Pressable>

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
          <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => void handleEmailSubmit()} style={({ pressed }) => [styles.primaryButton, isSubmitting && styles.disabledButton, pressed && !isSubmitting && styles.buttonPressed]}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}</Text></Pressable>
        </View>

        {mode === 'sign-up' && <Text style={styles.legal}>By continuing, you agree to the Stride Circle Terms of Service and Privacy Policy.</Text>}
        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => { setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'); setErrorMessage(null); }} style={({ pressed }) => [styles.modeButton, pressed && styles.modeButtonPressed]}><Text style={styles.modeText}>{mode === 'sign-up' ? 'Already have an account? Sign in' : 'New to Stride Circle? Create an account'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#FFFFFF', flex: 1 },
  loadingPage: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 14, justifyContent: 'center' },
  loadingMark: { alignItems: 'center', backgroundColor: colors.hero, borderRadius: 18, height: 58, justifyContent: 'center', width: 58 },
  loadingText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  content: { gap: 22, minHeight: '100%', paddingHorizontal: 28 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandMark: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 10, height: 30, justifyContent: 'center', width: 30 }, brandMarkText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: -0.4 }, brandName: { color: colors.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  intro: { gap: 9, marginTop: 58 },
  title: { color: '#090A0C', fontSize: 39, fontWeight: '900', letterSpacing: -1.8, lineHeight: 43 },
  subtitle: { color: '#566073', fontSize: 16, lineHeight: 23 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 16 }, dividerLine: { backgroundColor: '#C9CDD4', flex: 1, height: 1 }, dividerText: { color: '#545B69', fontSize: 13 },
  form: { gap: 12 }, field: { gap: 9 }, fieldLabel: { color: '#15171B', fontSize: 16, fontWeight: '700' },
  input: { backgroundColor: '#FFFFFF', borderColor: '#D7DAE0', borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 58, paddingHorizontal: 16 }, inputFocused: { borderColor: '#2E62DD', borderWidth: 1.5 },
  passwordField: { gap: 9 }, passwordInputWrapper: { position: 'relative' }, passwordInput: { backgroundColor: '#FFFFFF', borderColor: '#D7DAE0', borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 58, paddingHorizontal: 16, paddingRight: 42 }, passwordToggle: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -11 }], alignItems: 'center', justifyContent: 'center' }, passwordTogglePressed: { opacity: 0.6 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 16, minHeight: 58, justifyContent: 'center', marginTop: 8 }, primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  disabledButton: { opacity: 0.48 }, error: { color: '#B42318', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  googleButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#BFC4CC', borderRadius: 30, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 58, position: 'relative' }, googleIcon: { left: 18, position: 'absolute' }, googleText: { color: '#343840', fontSize: 17, fontWeight: '800' },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  legal: { color: '#454A55', fontSize: 13, lineHeight: 19, marginTop: 2, textAlign: 'center' },
  modeButton: { alignItems: 'center', marginTop: 2, padding: 11 }, modeButtonPressed: { opacity: 0.68 }, modeText: { color: colors.accentPressed, fontSize: 14, fontWeight: '800' },
});