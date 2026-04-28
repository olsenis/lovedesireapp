import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export interface HelpState {
  enabled: boolean;
  seen: string[]; // feature keys that have been dismissed
}

const defaultState: HelpState = { enabled: true, seen: [] };

export async function getHelpState(uid: string): Promise<HelpState> {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'help'));
  return snap.exists() ? (snap.data() as HelpState) : defaultState;
}

export async function markFeatureSeen(uid: string, feature: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'private', 'help');
  try {
    await updateDoc(ref, { seen: arrayUnion(feature) });
  } catch {
    await setDoc(ref, { ...defaultState, seen: [feature] });
  }
}

export async function setHelpEnabled(uid: string, enabled: boolean): Promise<void> {
  const ref = doc(db, 'users', uid, 'private', 'help');
  try {
    await updateDoc(ref, { enabled });
  } catch {
    await setDoc(ref, { ...defaultState, enabled });
  }
}

export async function disableAllHelp(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'help'), { enabled: false, seen: [] });
}

export async function resetHelp(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'help'), defaultState);
}
