import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'WisePath',
  slug: 'wisepath',
  version: '2.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#FFFDF8',
  // Students install the Android app; web is the browser preview from `npx expo start` → w.
  platforms: ['android', 'web'],
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.wisepath.app',
    // Raise on every APK you hand out so it installs as an update (v1 used 2; 2.0's first builds used 3).
    versionCode: 4,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    softwareKeyboardLayoutMode: 'resize',
  },
  web: {
    bundler: 'metro',
    output: 'single',
    name: 'WisePath',
    favicon: './assets/icon.png',
    themeColor: '#FFFDF8',
  },
  plugins: [
    'expo-font',
    [
      'expo-image-picker',
      { photosPermission: 'Allow WisePath to access your photos for your profile picture.' },
    ],
    [
      'expo-splash-screen',
      { image: './assets/splash.png', imageWidth: 240, resizeMode: 'contain', backgroundColor: '#FFFFFF' },
    ],
  ],
  scheme: 'wisepath',
  extra: {
    // EAS project @ciandrie/wisepath (v1 used a teammate's project; the signing keystore is unchanged).
    eas: { projectId: 'a20168cf-6ca5-4060-a29c-a10fb6421ce6' },
  },
};

export default config;
