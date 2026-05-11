import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ConsentState {
  confirmed: boolean;
  confirmedAt: number;
}

export async function getConsent(uid: string): Promise<ConsentState | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'consent'));
  return snap.exists() ? (snap.data() as ConsentState) : null;
}

export async function confirmConsent(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'consent'), {
    confirmed: true,
    confirmedAt: Date.now(),
  });
}
