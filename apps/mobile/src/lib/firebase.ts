import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { authPersistence } from './authPersistence';

const env = process.env;

export const useEmulators = env.EXPO_PUBLIC_USE_EMULATORS === 'true';
// 10.0.2.2 is the Android emulator's alias for this computer; the browser preview runs on it directly.
const emulatorHost = env.EXPO_PUBLIC_EMULATOR_HOST || (Platform.OS === 'web' ? 'localhost' : '10.0.2.2');

const firebaseConfig = useEmulators
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'demo-wisepath.firebaseapp.com',
      projectId: 'demo-wisepath',
      appId: '1:000000000000:android:demo',
    }
  : {
      apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, { persistence: authPersistence });
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true });

if (useEmulators) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
