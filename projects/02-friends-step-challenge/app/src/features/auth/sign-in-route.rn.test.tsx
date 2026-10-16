import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignInRoute from '@/app/sign-in';

const mockCreateAccount = jest.fn();
const mockSignInWithEmail = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/services/auth/google-sign-in', () => ({ signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args) }));
jest.mock('expo-router', () => ({ Redirect: () => null }));
jest.mock('@/auth/auth-provider', () => ({
  useAuth: () => ({ isConfigured: true, isLoading: false, user: null }),
}));
jest.mock('@/lib/auth', () => ({
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  getAuthErrorMessage: (error: { code?: string }) => (
    error.code === 'auth/invalid-credential' ? 'That email or password is not correct.' : 'Something went wrong.'
  ),
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args),
  signInWithGoogleIdToken: jest.fn(),
}));
jest.mock('@/design-system/use-app-theme', () => ({
  ...jest.requireActual('@/design-system/use-app-theme'),
  useAppColors: () => ({
    accent: '#13B5E8',
    accentPressed: '#087CA5',
    background: '#FFFFFF',
    border: '#D7E1E5',
    brandActionPressed: '#087CA5',
    card: '#FFFFFF',
    dangerContent: '#A6423B',
    hero: '#EAF8FC',
    ink: '#173342',
    muted: '#61727A',
    onAccent: '#FFFFFF',
  }),
}));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

async function renderSignInRoute() {
  return await render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}>
      <SignInRoute />
    </SafeAreaProvider>,
  );
}

describe('sign-in route', () => {
  beforeEach(() => {
    mockCreateAccount.mockReset().mockResolvedValue(undefined);
    mockSignInWithEmail.mockReset().mockResolvedValue(undefined);
    mockSignInWithGoogle.mockReset().mockResolvedValue('success');
  });

  it('opens Google sign-in and releases the controls when cancelled', async () => {
    mockSignInWithGoogle.mockResolvedValue('cancelled');
    const screen = await renderSignInRoute();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in with Google' }).props.accessibilityState.disabled).toBe(false));
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });

  it('shows an error and allows retry when Google login fails', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google failed'));
    const screen = await renderSignInRoute();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
    await waitFor(() => expect(screen.getByText('Something went wrong.')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });

  it('prevents duplicate Google requests while sign-in is open', async () => {
    let finish!: (result: string) => void;
    mockSignInWithGoogle.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const screen = await renderSignInRoute();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(screen.getByRole('button', { name: 'Sign in with Google' }).props.accessibilityState.busy).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    finish('cancelled');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in with Google' }).props.accessibilityState.busy).toBe(false));
  });

  it('opens account creation and submits the entered name, email, and password', async () => {
    const screen = await renderSignInRoute();

    expect(screen.getByText('Welcome back')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New to Wakà? Create an account' }));

    expect(screen.getByText('Create your account')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Your name'), 'Walker One');
    await fireEvent.changeText(screen.getByLabelText('Email address'), 'walker@example.test');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'safe-test-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith({
        displayName: 'Walker One',
        email: 'walker@example.test',
        password: 'safe-test-password',
      });
    });
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it('submits email sign-in and presents a friendly credential error', async () => {
    mockSignInWithEmail.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const screen = await renderSignInRoute();

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'walker@example.test');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-test-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('That email or password is not correct.')).toBeTruthy());
    expect(mockSignInWithEmail).toHaveBeenCalledWith({
      email: 'walker@example.test',
      password: 'wrong-test-password',
    });
  });
});
