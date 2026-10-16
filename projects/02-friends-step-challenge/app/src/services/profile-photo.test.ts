import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { createProfilePhotoSaver, validateProfilePhoto } from './profile-photo';

const mock = vi.hoisted(() => ({ upload: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/auth', () => ({ updateUserAvatar: mock.save }));
const storage = { uploadProfilePhoto: mock.upload, deleteAsset: mock.remove };
const saveProfilePhoto = createProfilePhotoSaver({ storage, saveAvatar: mock.save });
const asset = { schemaVersion: 1 as const, purpose: 'profile-photo' as const, id: 'asset-0001', ownerId: 'walker', provider: 'imagekit', providerFileId: 'file-1', url: 'https://example.com/new.jpg' };
const photo = { uri: 'file:///photo.jpg', base64: 'YWJj', mimeType: 'image/jpeg' };
const user = { uid: 'walker' } as User;
const avatar = { seed: 'walker', style: 'sprouts' as const };
beforeEach(() => { vi.resetAllMocks(); mock.upload.mockResolvedValue(asset); mock.remove.mockResolvedValue(undefined); });

describe('profile photos', () => {
  it('rejects invalid formats, unreadable data and oversized images before upload', () => {
    expect(() => validateProfilePhoto({ ...photo, mimeType: 'image/svg+xml' })).toThrow('JPG');
    expect(() => validateProfilePhoto({ ...photo, base64: '' })).toThrow('read');
    expect(() => validateProfilePhoto({ ...photo, base64: 'a'.repeat(7 * 1024 * 1024) })).toThrow('5 MB');
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it('uploads to the signed-in owner path and persists the URL, not image bytes', async () => {
    await saveProfilePhoto({ photo, user, avatar });
    expect(mock.upload).toHaveBeenCalledWith(photo, 'walker');
    expect(mock.save).toHaveBeenCalledWith({ user, avatar: { ...avatar, photoURL: asset.url, photoAsset: asset } });
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('does not change the profile when upload fails', async () => {
    mock.upload.mockRejectedValueOnce(new Error('offline'));
    await expect(saveProfilePhoto({ photo, user, avatar })).rejects.toThrow('offline');
    expect(mock.save).not.toHaveBeenCalled();
  });
  it('cleans up the new photo if saving its reference fails', async () => {
    mock.save.mockRejectedValueOnce(new Error('denied'));
    await expect(saveProfilePhoto({ photo, user, avatar })).rejects.toThrow('denied');
    expect(mock.remove).toHaveBeenCalledWith(asset, 'walker');
  });
  it('never deletes another owner’s previous image', async () => {
    await saveProfilePhoto({ photo, user, avatar: { ...avatar, photoAsset: { ...asset, id: 'previous-id', ownerId: 'other' } } });
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('replaces storage providers without changing profile-save behavior', async () => {
    const replacement = { ...asset, provider: 'replacement-store', providerFileId: 'new-provider-file' };
    mock.upload.mockResolvedValue(replacement);
    await saveProfilePhoto({ photo, user, avatar });
    expect(mock.save).toHaveBeenCalledWith({ user, avatar: { ...avatar, photoURL: replacement.url, photoAsset: replacement } });
  });
  it('removes an old owned upload only after the new photo has been saved', async () => {
    const previous = { ...asset, id: 'previous-id', providerFileId: 'previous-file' };
    mock.remove.mockImplementation(async () => { expect(mock.save).toHaveBeenCalledTimes(1); });
    await saveProfilePhoto({ photo, user, avatar: { ...avatar, photoAsset: previous } });
    expect(mock.remove).toHaveBeenCalledWith(previous, 'walker');
  });
  it('does not turn a cleanup failure into a failed save', async () => {
    mock.remove.mockRejectedValue(new Error('unavailable'));
    await expect(saveProfilePhoto({ photo, user, avatar: { ...avatar, photoAsset: { ...asset, id: 'previous-id' } } })).resolves.toBeUndefined();
  });
});
