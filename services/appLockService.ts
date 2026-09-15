import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// App lock (Sep 2026, USER_VOICE A7). Face ID, Touch ID, fingerprint or the
// phone's passcode before the app shows anything, on a cold start and after
// LOCK_AFTER_MS in the background. Off by default. The flag is device-local
// (AsyncStorage, like the Spicy consent): it protects THIS phone, and the
// partner cannot switch it on or off from theirs. The OS owns the secret,
// so there is no PIN of ours to forget or to store.

const KEY = 'app_lock_enabled';
export const LOCK_AFTER_MS = 60_000;

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setAppLockEnabled(on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(KEY, '1');
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Best effort; the hook keeps its in-memory state either way.
  }
}

// True when the phone has something to authenticate with: biometrics that
// are enrolled, or at least a device passcode. Without this the switch
// stays off, so nobody can lock themselves out of the app.
export async function canUseAppLock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticate(reason: string = 'Unlock'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
