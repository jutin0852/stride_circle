import { readMediaAsset, type MediaStorage } from '@/domain/media-storage';

/** Provider-independent API: no vendor SDK, keys, or URL-building in the app. */
export function createHttpMediaStorage(input: {
  baseUrl: string | undefined;
  getAccessToken: () => Promise<string>;
  fetcher?: typeof fetch;
}): MediaStorage {
  const fetcher = input.fetcher ?? fetch;
  async function request(path: string, body: unknown) {
    const base = new URL(input.baseUrl ?? '');
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Photo storage is not configured.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const token = await input.getAccessToken();
      if (!token) throw new Error('Sign in to save a profile photo.');
      const response = await fetcher(`${base.href.replace(/\/$/, '')}${path}`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Your photo could not be saved. Please try again.');
      return response.status === 204 ? undefined : response.json();
    } finally { clearTimeout(timeout); }
  }
  return {
    async uploadProfilePhoto(photo, ownerId) {
      const result = await request('/v1/profile-photos', { base64: photo.base64, mimeType: photo.mimeType });
      const asset = readMediaAsset(result, ownerId);
      if (!asset) throw new Error('The uploaded photo could not be verified.');
      return asset;
    },
    async deleteAsset(asset, ownerId) {
      if (!readMediaAsset(asset, ownerId)) throw new Error('This photo does not belong to this account.');
      await request('/v1/profile-photos/delete', { asset });
    },
  };
}
