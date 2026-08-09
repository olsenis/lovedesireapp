// Custom Metro config. Extends Expo's default and adds `web/` + `sex-ed/`
// to the blocklist so the marketing site (Astro + Tailwind, entirely
// separate Vercel project) and content vault are never scanned or bundled
// into the mobile app.
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
];

module.exports = config;
