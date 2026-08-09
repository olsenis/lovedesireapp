// Custom Metro config. Extends Expo's default and adds `web/` to the
// blocklist so the marketing site (Astro + Tailwind, entirely separate
// Vercel project) is never scanned or bundled into the mobile app.
// Without this, Metro would try to resolve web/'s node_modules and pull
// its files into module maps.
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  // Escape backslashes for cross-platform (Windows dev environments).
  new RegExp(`${path.resolve(__dirname, 'web').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
  // Also block sex-ed content vault — pure markdown, not code.
  new RegExp(`${path.resolve(__dirname, 'sex-ed').replace(/[\\/]/g, '[\\\\/]')}[\\\\/].*`),
]);

module.exports = config;
