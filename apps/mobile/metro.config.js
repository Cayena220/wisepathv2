const { getDefaultConfig } = require('expo/metro-config');

// Expo SDK 57 detects the npm-workspaces monorepo on its own (watchFolders, node_modules paths).
const config = getDefaultConfig(__dirname);

// Firebase JS SDK on React Native ("Component auth has not been registered yet" fix).
// https://docs.expo.dev/guides/using-firebase/#configure-metro
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
