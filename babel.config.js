// Expo default preset + production-only console stripping.
//
// transform-remove-console runs ONLY in production builds (EAS build /
// production Vercel export). Dev builds keep console.* for debugging.
// Without this, console.log statements ship in the release bundle and
// end up in adb logcat / Xcode Console when a device is USB-attached —
// NV6 in Aug 2026 security review v2. Notable specific leak was
// [joinCouple] rateLimitedJoin printing the coupleId on every join.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
