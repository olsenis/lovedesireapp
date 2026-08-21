import { doc, setDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

export interface PhotoConsentState {
  confirmed: boolean;
  confirmedAt: number;
}

const CACHE_PREFIX = 'photoConsent:';

export async function hasPhotoConsent(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + uid);
    if (cached === '1') return true;
  } catch {}
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'photoConsent'));
  const confirmed = snap.exists() && (snap.data() as PhotoConsentState).confirmed === true;
  if (confirmed) {
    try { await AsyncStorage.setItem(CACHE_PREFIX + uid, '1'); } catch {}
  }
  return confirmed;
}

export async function confirmPhotoConsent(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'photoConsent'), {
    confirmed: true,
    confirmedAt: Date.now(),
  });
  try { await AsyncStorage.setItem(CACHE_PREFIX + uid, '1'); } catch {}
}
