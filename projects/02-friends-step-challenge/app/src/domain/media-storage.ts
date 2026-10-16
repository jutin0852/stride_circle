/** App-owned identity survives changing hosts. Provider locators are data, not UI logic. */
export type MediaAsset = {
  schemaVersion: 1;
  id: string;
  ownerId: string;
  purpose: 'profile-photo';
  provider: string;
  providerFileId: string;
  url: string;
};

export type ProfilePhoto = { base64: string; mimeType: string; uri: string };

export interface MediaStorage {
  uploadProfilePhoto(photo: ProfilePhoto, ownerId: string): Promise<MediaAsset>;
  deleteAsset(asset: MediaAsset, ownerId: string): Promise<void>;
}

export function readMediaAsset(value: unknown, ownerId: string): MediaAsset | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || data.purpose !== 'profile-photo' || data.ownerId !== ownerId
    || typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(data.id)
    || typeof data.provider !== 'string' || !/^[a-z][a-z0-9-]{1,31}$/.test(data.provider)
    || typeof data.providerFileId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(data.providerFileId)
    || typeof data.url !== 'string') return undefined;
  try {
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
  } catch { return undefined; }
  return {
    schemaVersion: 1, purpose: 'profile-photo', id: data.id, ownerId,
    provider: data.provider, providerFileId: data.providerFileId, url: data.url,
  };
}
