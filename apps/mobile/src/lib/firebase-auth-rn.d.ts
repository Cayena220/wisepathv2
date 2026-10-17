// firebase/auth ships getReactNativePersistence in its React Native build, but the
// published type definitions do not declare it. Metro resolves the RN build at runtime.
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): import('firebase/auth').Persistence;
}
