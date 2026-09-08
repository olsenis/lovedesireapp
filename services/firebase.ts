import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
// getReactNativePersistence is a runtime export but not in TS types yet — import via require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as { getReactNativePersistence: (storage: any) => any };
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXervwr8BoK-5tB0EN0bUWoduLz3x0iw4",
  authDomain: "lovedesireapp-8c7f2.firebaseapp.com",
  projectId: "lovedesireapp-8c7f2",
  storageBucket: "lovedesireapp-8c7f2.firebasestorage.app",
  messagingSenderId: "450675936461",
  appId: "1:450675936461:web:c1a150b2eb14ad99e56d84",
};

// Prevent re-initializing on hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// On native (iOS/Android) use AsyncStorage so users stay logged in across app launches.
// On web, default persistence (IndexedDB/localStorage) works out of the box.
let _auth: Auth;
if (Platform.OS === 'web') {
  _auth = getAuth(app);
} else {
  try {
    _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized (e.g. fast refresh) — fall back to getAuth
    _auth = getAuth(app);
  }
}

export const auth = _auth;

// Firestore's default transport is WebChannel, which is tuned for browsers
// and flakes through React Native's networking stack (tunnel, cellular
// switches, backgrounding), spamming "RPC 'Listen' stream transport
// errored" warnings on every flap.
//
// Sep 8 2026: an earlier attempt set experimentalAutoDetectLongPolling,
// which has been the SDK default since v9.22 (May 2023) and so changed
// nothing; the warning is logged precisely during auto-detect's failed
// WebChannel probe. experimentalForceLongPolling skips WebChannel
// entirely. Long-polling costs a little latency, imperceptible at this
// app's ~20 subscriptions and low write volume, and is the standard
// recommendation for React Native. The two settings are mutually
// exclusive, so this replaces rather than adds.
//
// Web preview (Vercel, not a target platform) also gets long-polling;
// fine for a dev preview.
let _db: Firestore;
try {
  _db = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  // Already initialized (fast refresh) — reuse existing instance
  _db = getFirestore(app);
}
export const db = _db;
export const storage = getStorage(app);
export default app;
