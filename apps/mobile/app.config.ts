import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'WisePath',
  slug: 'wisepath',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#FFFDF8',
  platforms: ['android'],
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.wisepath.app',
    // Must stay above v1's versionCode (2) so the new APK installs over the old one.
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFDF8',
    },
    softwareKeyboardLayoutMode: 'resize',
  },
  plugins: [
    'expo-font',
    [
      'expo-image-picker',
      { photosPermission: 'Allow WisePath to access your photos for your profile picture.' },
    ],
    [
      'expo-splash-screen',
      { image: './assets/splash.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#FFFDF8' },
    ],
  ],
  scheme: 'wisepath',
  extra: {
    eas: { projectId: '176d696c-29b5-4d0e-a8ad-f91123feb736' },
  },
};

export default config;
