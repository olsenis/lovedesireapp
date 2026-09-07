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

// Firestore WebChannel transport works over browsers but flakes badly
// through React Native + tunnel / cellular network switches, spamming
// "RPC 'Listen' stream transport errored" warnings. Auto-detect long-
// polling as a fallback: the SDK still tries WebChannel first, then
// gracefully drops to long-polling when the transport misbehaves.
// Safe on all platforms; on web it stays on WebChannel unless needed.
let _db: Firestore;
try {
  _db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  // Already initialized (fast refresh) — reuse existing instance
  _db = getFirestore(app);
}
export const db = _db;
export const storage = getStorage(app);
export default app;
