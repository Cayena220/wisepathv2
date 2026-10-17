import { browserLocalPersistence } from 'firebase/auth';

// Browser preview (`expo start` → w): the web build of firebase/auth has no getReactNativePersistence.
export const authPersistence = browserLocalPersistence;
