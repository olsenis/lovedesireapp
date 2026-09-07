import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go SDK 53+ removed remote-push support. On Android specifically
// (see node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js) the
// module's top-level auto-registration side effect throws an uncaught
// Error at import time, blocking the whole app from loading. iOS in
// Expo Go just prints a warn and keeps running.
//
// Guard by lazy-requiring only when it's safe. Consumers must null-check
// before use. Once we ship dev-client builds (post-H40, blocked on Apple
// Developer enrollment), this guard becomes a no-op and every path lights
// up again — including real push tokens.
const isExpoGoAndroid =
  (Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient') &&
  Platform.OS === 'android';

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const Notifications: typeof import('expo-notifications') | null =
  isExpoGoAndroid ? null : require('expo-notifications');
