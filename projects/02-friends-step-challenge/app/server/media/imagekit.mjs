import { MediaError } from './gateway.mjs';

/** Only this module knows ImageKit's API, URL conventions and file IDs. */
export function createImageKitStorage({ privateKey, urlEndpoint, fetcher = fetch }) {
  const endpoint = new URL(urlEndpoint);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !privateKey) throw new Error('Invalid server media configuration.');
  const deliveryBase = `${endpoint.href.replace(/\/$/, '')}/`;
  const authorization = `Basic ${btoa(`${privateKey}:`)}`;
  async function call(url, options = {}) {
    const response = await fetcher(url, {
      ...options, signal: AbortSignal.timeout(30_000),
      headers: { ...options.headers, Authorization: authorization },
    });
    if (!response.ok) throw new MediaError(503, 'Photo provider unavailable.');
    return response.status === 204 ? undefined : response.json();
  }
  async function folder(ownerId) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ownerId));
    const ownerKey = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    return `/profile-photos/${ownerKey}`;
  }
  return {
    async uploadProfilePhoto(photo, ownerId) {
      const id = crypto.randomUUID();
      const extension = photo.mimeType === 'image/jpeg' ? 'jpg' : photo.mimeType === 'image/png' ? 'png' : 'webp';
      const name = `${id}.${extension}`;
      const path = await folder(ownerId);
      const form = new FormData();
      form.set('file', `data:${photo.mimeType};base64,${photo.base64}`);
      form.set('fileName', name);
      form.set('folder', path);
      form.set('useUniqueFileName', 'false');
      form.set('isPrivateFile', 'false');
      const result = await call('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
      if (!result || typeof result.fileId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(result.fileId)
        || result.filePath !== `${path}/${name}` || typeof result.url !== 'string'
        || !result.url.startsWith(deliveryBase)) throw new MediaError(503, 'Invalid photo provider response.');
      return { schemaVersion: 1, id, ownerId, purpose: 'profile-photo', provider: 'imagekit', providerFileId: result.fileId, url: result.url };
    },
    async deleteAsset(asset, ownerId) {
      if (asset.provider !== 'imagekit' || asset.ownerId !== ownerId) throw new MediaError(409, 'The photo needs its original storage adapter.');
      const file = await call(`https://api.imagekit.io/v1/files/${encodeURIComponent(asset.providerFileId)}/details`);
      const prefix = `${await folder(ownerId)}/${asset.id}.`;
      // Provider metadata, not the caller's URL/ownerId, proves actual ownership.
      if (typeof file?.filePath !== 'string' || !['jpg', 'png', 'webp'].some(extension => file.filePath === `${prefix}${extension}`)) {
        throw new MediaError(403, 'This photo cannot be removed by this account.');
      }
      await call(`https://api.imagekit.io/v1/files/${encodeURIComponent(asset.providerFileId)}`, { method: 'DELETE' });
    },
  };
}
