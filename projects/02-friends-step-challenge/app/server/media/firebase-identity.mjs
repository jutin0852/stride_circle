import { MediaError } from './gateway.mjs';

/** Identity is independent of storage and hosting; no Admin SDK/service key needed. */
export function createFirebaseVerifier({ projectId, webApiKey, fetcher = fetch }) {
  if (!projectId || !webApiKey) throw new Error('Server identity configuration required.');
  return async authorization => {
    const token = authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token || token.length > 8192) throw new MediaError(401, 'Sign in required.');
    let claims;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), character => character.charCodeAt(0))));
    } catch { throw new MediaError(401, 'Invalid sign-in.'); }
    if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) throw new MediaError(401, 'Invalid sign-in.');
    // Decoding above is NOT verification. Firebase verifies the ID token here.
    const response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`, {
      method: 'POST', signal: AbortSignal.timeout(10_000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
    });
    if (response.status >= 500 || response.status === 429) throw new MediaError(503, 'Sign-in verification unavailable.');
    if (!response.ok) throw new MediaError(401, 'Sign in again.');
    const result = await response.json();
    const user = result.users?.[0];
    if (!user || user.disabled || typeof user.localId !== 'string' || user.localId !== claims.sub) throw new MediaError(401, 'Invalid sign-in.');
    return user.localId;
  };
}
