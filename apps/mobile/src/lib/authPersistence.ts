import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from 'firebase/auth';

// Keeps students signed in between app launches. The web build uses authPersistence.web.ts.
export const authPersistence = getReactNativePersistence(AsyncStorage);
