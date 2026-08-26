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
    // Aug 26: the three @babel/plugin-transform-{class-properties,
    // private-methods,private-property-in-object} plugins were added
    // as defensive fix for a Firebase v12 Hermes "private properties
    // are not supported" runtime error, then removed once `npx expo
    // install --fix` aligned babel-preset-expo from ^57.0.6 to the
    // correct ~54.0.10 for our SDK 54 project. The correct preset
    // handles Firebase v12's class-field syntax natively, so the
    // extra plugins were redundant. Worse: strict mode emitted
    // defineProperty calls that broke FlatList/VirtualizedList
    // ("property is not configurable"), and loose mode emitted
    // simple-assignments that broke frozen enums ("Cannot assign to
    // read-only property 'NONE'" in Event/emit stack). Both failed
    // on the same underlying Object.freeze'd properties, just
    // differently. Removing the plugins entirely resolves both.
    env: {
      production: {
        plugins: [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
