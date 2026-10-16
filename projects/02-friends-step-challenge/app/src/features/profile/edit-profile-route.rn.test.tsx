import { Alert, StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EditProfileRoute from '@/app/edit-profile';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUpdate = jest.fn();
const mockPick = jest.fn();
const mockSavePhoto = jest.fn();
const mockSaveAvatar = jest.fn();
const mockPreparePhoto = jest.fn();
let mockParams: { characterStyle?: string } = {};
const mockSetParams = jest.fn((params) => { mockParams = { ...mockParams, ...params }; });
jest.mock('@/services/profile-photo-preparation', () => ({ prepareProfilePhoto: (...args: unknown[]) => mockPreparePhoto(...args) }));
jest.mock('expo-image-picker', () => ({ UIImagePickerPreferredAssetRepresentationMode: { Current: 'current' }, launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args) }));
jest.mock('@/services/profile-photo', () => ({
  saveProfilePhoto: (...args: unknown[]) => mockSavePhoto(...args),
  validateProfilePhoto: jest.fn(),
  getProfilePhotoError: () => 'Your photo could not be saved. Please try again.',
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { back: () => mockBack(), push: (...args: unknown[]) => mockPush(...args), setParams: (...args: [object]) => mockSetParams(...args) } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'walker-1' } }) }));
jest.mock('@/hooks/use-user-profile', () => ({ useUserProfile: () => ({ avatar: { seed: 'walker-1', style: 'sprouts' }, displayName: 'Walker One' }) }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
jest.mock('@/lib/auth', () => ({ updateUserAvatar: (...args: unknown[]) => mockSaveAvatar(...args), updateUserDisplayName: (...args: unknown[]) => mockUpdate(...args), getAuthErrorMessage: () => 'Please try again.' }));
beforeEach(() => { jest.clearAllMocks(); mockParams = {}; jest.spyOn(Alert, 'alert').mockImplementation(() => {}); mockUpdate.mockResolvedValue(undefined); mockSaveAvatar.mockResolvedValue(undefined); mockSavePhoto.mockResolvedValue(undefined); mockPreparePhoto.mockResolvedValue({ uri: 'file:///portrait.jpg', base64: 'YWJj', mimeType: 'image/jpeg' }); mockPick.mockResolvedValue({ canceled: true }); });

async function show() {
  return render(<SafeAreaProvider initialMetrics={{ frame: { width: 390, height: 844, x: 0, y: 0 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } }}><EditProfileRoute /></SafeAreaProvider>);
}
async function useSelectedPhoto(screen: Awaited<ReturnType<typeof show>>) {
  await waitFor(() => expect(screen.getByRole('header', { name: 'Adjust photo' })).toBeTruthy());
  await fireEvent(screen.getByTestId('profile-photo-crop-image'), 'load');
  await fireEvent.press(screen.getByRole('button', { name: 'Use photo' }));
}
it('gives the fixed heading sufficient line height and keeps form content below it', async () => {
  const screen = await show();
  const title = screen.getByRole('header', { name: 'Edit profile' });
  const typography = StyleSheet.flatten(title.props.style);
  expect(typography.fontSize).toBe(32);
  expect(typography.lineHeight).toBe(40);
  const body = within(screen.getByTestId('edit-profile-form'));
  expect(body.queryByText('Edit profile')).toBeNull();
  expect(body.getByText('Profile picture')).toBeTruthy();
  expect(body.getByLabelText('Display name')).toBeTruthy();
});

it('leaves the current picture unchanged when the picker is cancelled', async () => {
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
  expect(mockSavePhoto).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Selected profile picture')).toBeNull();
  expect(screen.getByRole('button', { name: 'Save changes' }).props.accessibilityState.disabled).toBe(true);
});

it('previews the chosen photo and uploads it only on Save', async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///portrait.jpg', width: 2000, height: 2000, mimeType: 'image/jpeg' }] });
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  await waitFor(() => expect(screen.getByLabelText('Selected profile picture')).toBeTruthy());
  expect(mockSavePhoto).not.toHaveBeenCalled();
  expect(mockPick).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], allowsEditing: false, preferredAssetRepresentationMode: 'current', base64: false, quality: 1, exif: false }));
  expect(mockPreparePhoto).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mockSavePhoto).toHaveBeenCalledWith(expect.objectContaining({ photo: { uri: 'file:///portrait.jpg', base64: 'YWJj', mimeType: 'image/jpeg' } })));
  expect(mockUpdate).not.toHaveBeenCalled();
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(Alert.alert).toHaveBeenCalledWith('Profile saved', expect.any(String));
});

it('retains the selected photo and allows retry after a failed upload', async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///portrait.jpg', width: 2000, height: 2000, mimeType: 'image/jpeg' }] });
  mockSavePhoto.mockRejectedValueOnce(new Error('offline'));
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  await waitFor(() => expect(screen.getByLabelText('Selected profile picture')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not update profile', expect.any(String)));
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Selected profile picture')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockSavePhoto).toHaveBeenCalledTimes(2);
});
it('preserves editing, saving and character navigation', async () => {
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: /Choose a character/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/profile-character', params: { returnTo: 'edit-profile' } });
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Updated Walker');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ displayName: 'Updated Walker', user: { uid: 'walker-1' } }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});

it('keeps an unsaved large photo and name when browsing characters without choosing one', async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///large.heic', width: 6000, height: 6000, fileSize: 30_000_000, mimeType: 'image/heic' }] });
  const screen = await show();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'My draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  await waitFor(() => expect(screen.getByLabelText('Selected profile picture').props.source.uri).toBe('file:///large.heic'));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose a character' }));
  expect(screen.getByLabelText('Selected profile picture').props.source.uri).toBe('file:///large.heic');
  expect(screen.getByLabelText('Display name').props.value).toBe('My draft');
  expect(mockSavePhoto).not.toHaveBeenCalled();
  expect(mockSaveAvatar).not.toHaveBeenCalled();
  expect(mockPreparePhoto).not.toHaveBeenCalled();
});

it('replaces a pending photo only after a character is selected, and persists only on Save', async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///portrait.jpg', width: 2000, height: 2000 }] });
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  await waitFor(() => expect(screen.getByLabelText('Selected profile picture')).toBeTruthy());
  mockParams = { characterStyle: 'clay' };
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Walker One');
  expect(screen.queryByLabelText('Selected profile picture')).toBeNull();
  expect(mockSaveAvatar).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mockSaveAvatar).toHaveBeenCalledWith({ user: { uid: 'walker-1' }, avatar: { seed: 'walker-1', style: 'clay' } }));
  expect(mockSavePhoto).not.toHaveBeenCalled();
});

it('keeps a photo draft after preparation fails without uploading it', async () => {
  mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///portrait.jpg', width: 2000, height: 2000 }] });
  mockPreparePhoto.mockRejectedValueOnce(new Error('unreadable'));
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  await waitFor(() => expect(screen.getByLabelText('Selected profile picture')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not update profile', expect.any(String)));
  expect(mockSavePhoto).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Selected profile picture')).toBeTruthy();
});

it('keeps the previous draft when a replacement crop is cancelled', async () => {
  mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///first.jpg', width: 2000, height: 2000 }] });
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await useSelectedPhoto(screen);
  mockPick.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///second.jpg', width: 4000, height: 3000 }] });
  await fireEvent.press(screen.getByRole('button', { name: 'Change photo' }));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Adjust photo' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Selected profile picture').props.source.uri).toBe('file:///first.jpg');
  expect(mockPreparePhoto).not.toHaveBeenCalled();
  expect(mockSavePhoto).not.toHaveBeenCalled();
});
