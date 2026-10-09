import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

const loadConfigPlugin = createRequire(import.meta.url);
const withLocalNotifications = loadConfigPlugin('../../../plugins/with-local-notifications.js');

it('removes the remote-push entitlement after other mods run and preserves unrelated entitlements', async () => {
  const config = withLocalNotifications({ name: 'test', slug: 'test', mods: { ios: {
    entitlements: async (mod: { modResults: Record<string, unknown> }) => {
      mod.modResults['aps-environment'] = 'development';
      mod.modResults['com.apple.developer.healthkit'] = true;
      return mod;
    },
  } } });
  const result = await config.mods.ios.entitlements({ modResults: {}, modRequest: {} });
  expect(result.modResults['aps-environment']).toBeUndefined();
  expect(result.modResults['com.apple.developer.healthkit']).toBe(true);
});
