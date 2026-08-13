// Custom Metro config. Extends Expo's default and adds `web/`, `sex-ed/`,
// and `admin-web/` to the blocklist so those directories are never scanned
// or bundled into the mobile app.
//
// - web/       marketing site (Astro + Tailwind, separate Vercel project)
// - sex-ed/    content vault, mostly private research
// - admin-web/ standalone admin dashboard (Vite + React, separate Vercel
//              project). Kept out of the mobile bundle so no admin code
//              ships in App Store binaries or Android APKs.
//
// blockList accepts an array of RegExps directly since Metro 0.70+ — the
// old `exclusionList()` helper reached into metro-config internals that
// newer versions hide behind package.json `exports`, breaking on CI.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  // Escape backslashes for cross-platform (Windows dev environments).
  new RegExp(`${path.resolve(__dirname, 'web').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
  new RegExp(`${path.resolve(__dirname, 'sex-ed').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
  new RegExp(`${path.resolve(__dirname, 'admin-web').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
];

module.exports = config;
