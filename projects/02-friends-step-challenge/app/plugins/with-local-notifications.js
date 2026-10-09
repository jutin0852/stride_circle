const { withBaseMod } = require('expo/config-plugins');

/** Local reminders do not require the paid iOS remote-push capability. */
module.exports = function withLocalNotifications(config) {
  return withBaseMod(config, {
    platform: 'ios',
    mod: 'entitlements',
    isIntrospective: true,
    async action(mod) {
      // Run the existing entitlement mods first: ordinary withEntitlementsPlist
      // callbacks run before nextMod, allowing the notification plugin to re-add it.
      const result = await mod.modRequest.nextMod(mod);
      delete result.modResults['aps-environment'];
      return result;
    },
  });
};
