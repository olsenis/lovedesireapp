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
    plugins: [
      // Firebase v12 ships ES2022 class-field syntax (both public
      // `field = value` and private `#field`) that Hermes (the JS
      // engine in Expo Go) can't parse. These three plugins transform
      // all class-field variants into simple-assignment equivalents
      // so bundles run cleanly on Hermes. See the runtime SyntaxError
      // "private properties are not supported" if any are removed.
      //
      // `loose: true` is CRITICAL. Without it, Babel emits
      // Object.defineProperty calls that conflict with React Native's
      // VirtualizedList / FlatList internals which mark certain
      // properties non-configurable — triggers "property is not
      // configurable" render error on any FlatList surface (Fantasy
      // Wishes matches, etc.). `loose: true` emits simple assignment
      // instead, avoiding the collision.
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ],
    env: {
      production: {
        plugins: [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
