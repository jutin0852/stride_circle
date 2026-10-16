import { getProfilePhotoSize, prepareProfilePhoto } from '@/services/profile-photo-preparation';

const mockResize = jest.fn();
const mockSave = jest.fn();
const mockReleaseImage = jest.fn();
const mockReleaseContext = jest.fn();
const mockRender = jest.fn();
const mockManipulate = jest.fn();
const mockValidate = jest.fn();
const mockCrop = jest.fn();
const mockOptionalModule = jest.fn();
jest.mock('expo', () => ({ requireOptionalNativeModule: (...args: unknown[]) => mockOptionalModule(...args) }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('@/services/profile-photo', () => ({ validateProfilePhoto: (...args: unknown[]) => mockValidate(...args) }));
beforeEach(() => {
  jest.clearAllMocks();
  mockOptionalModule.mockReturnValue({});
  mockManipulate.mockReturnValue({ crop: mockCrop, resize: mockResize, renderAsync: mockRender, release: mockReleaseContext });
  mockRender.mockResolvedValue({ saveAsync: mockSave, release: mockReleaseImage });
  mockSave.mockResolvedValue({ uri: 'file:///small.jpg', base64: 'YWJj' });
});

it('applies the chosen crop before resizing, matching the draft preview', async () => {
  const crop = { originX: 200, originY: 300, width: 2000, height: 2000 };
  await prepareProfilePhoto({ uri: 'file:///portrait.jpg', width: 5000, height: 4000, crop });
  expect(mockCrop).toHaveBeenCalledWith(crop);
  expect(mockResize).toHaveBeenCalledWith({ width: 1024, height: 1024 });
  expect(mockCrop.mock.invocationCallOrder[0]).toBeLessThan(mockResize.mock.invocationCallOrder[0]);
});

it('does not import the native image processor when the installed client lacks it', async () => {
  mockOptionalModule.mockReturnValueOnce(null);
  await expect(prepareProfilePhoto({ uri: 'file:///portrait.jpg', width: 5000, height: 4000 })).rejects.toThrow('Please update the app');
  expect(mockManipulate).not.toHaveBeenCalled();
});

it('bounds large dimensions, preserves aspect ratio and never enlarges small images', () => {
  expect(getProfilePhotoSize(8000, 6000)).toEqual({ width: 1024, height: 768 });
  expect(getProfilePhotoSize(3000, 6000)).toEqual({ width: 512, height: 1024 });
  expect(getProfilePhotoSize(96, 96)).toEqual({ width: 96, height: 96 });
  expect(getProfilePhotoSize(1, 20000)).toEqual({ width: 1, height: 1024 });
  for (const value of [0, -1, NaN, Infinity]) expect(() => getProfilePhotoSize(value, 100)).toThrow('read');
});

it('converts a large HEIC selection to high-quality bounded JPEG before encoding base64', async () => {
  const result = await prepareProfilePhoto({ uri: 'file:///huge.heic', width: 8000, height: 6000, mimeType: 'image/heic' });
  expect(mockResize).toHaveBeenCalledWith({ width: 1024, height: 768 });
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.9, base64: true });
  expect(result).toEqual({ uri: 'file:///small.jpg', mimeType: 'image/jpeg', base64: 'YWJj' });
  expect(mockValidate).toHaveBeenCalledWith(result);
  expect(mockReleaseImage).toHaveBeenCalledTimes(1);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
});

it('preserves PNG transparency without lossy JPEG conversion or upscaling', async () => {
  expect((await prepareProfilePhoto({ uri: 'file:///logo.png', width: 500, height: 500, mimeType: 'image/png' })).mimeType).toBe('image/png');
  expect(mockResize).not.toHaveBeenCalled();
  expect(mockSave).toHaveBeenCalledWith({ format: 'png', compress: 1, base64: true });
});

it('releases native image memory on encoding failure', async () => {
  mockSave.mockRejectedValueOnce(new Error('decode failed'));
  await expect(prepareProfilePhoto({ uri: 'file:///bad.jpg', width: 2000, height: 2000 })).rejects.toThrow('decode failed');
  expect(mockReleaseImage).toHaveBeenCalledTimes(1);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
});
