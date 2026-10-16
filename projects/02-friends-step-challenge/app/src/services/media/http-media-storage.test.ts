import { describe, expect, it, vi } from 'vitest';
import { createHttpMediaStorage } from './http-media-storage';
import type { MediaAsset } from '@/domain/media-storage';
const asset: MediaAsset = { schemaVersion: 1, purpose: 'profile-photo', id: 'asset-0001', ownerId: 'walker', provider: 'imagekit', providerFileId: 'file-1', url: 'https://ik.imagekit.io/wakawalks/photo.jpg' };
const photo = { uri: 'file:///private/local/path.jpg', base64: '/9j/AA==', mimeType: 'image/jpeg' };

describe('media API adapter', () => {
  it('authenticates and sends only photo bytes and type, not local paths or a trusted ownerId', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(asset));
    const storage = createHttpMediaStorage({ baseUrl: 'https://media.example.com', getAccessToken: async () => 'firebase-token', fetcher });
    expect(await storage.uploadProfilePhoto(photo, 'walker')).toEqual(asset);
    expect(fetcher).toHaveBeenCalledWith('https://media.example.com/v1/profile-photos', expect.objectContaining({
      headers: { Authorization: 'Bearer firebase-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: photo.base64, mimeType: photo.mimeType }),
    }));
  });
  it('rejects malformed or other-owner provider responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ...asset, ownerId: 'other' }));
    const storage = createHttpMediaStorage({ baseUrl: 'https://media.example.com', getAccessToken: async () => 'token', fetcher });
    await expect(storage.uploadProfilePhoto(photo, 'walker')).rejects.toThrow('verified');
  });
  it('refuses to send credentials over insecure endpoints', async () => {
    const fetcher = vi.fn();
    const storage = createHttpMediaStorage({ baseUrl: 'http://media.example.com', getAccessToken: async () => 'token', fetcher });
    await expect(storage.uploadProfilePhoto(photo, 'walker')).rejects.toThrow('configured');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not send a deletion for another account’s asset', async () => {
    const fetcher = vi.fn();
    const storage = createHttpMediaStorage({ baseUrl: 'https://media.example.com', getAccessToken: async () => 'token', fetcher });
    await expect(storage.deleteAsset(asset, 'other')).rejects.toThrow('belong');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
