import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface OnboardingState {
  completed: boolean;
  completedAt: number;
}

export async function getOnboardingState(uid: string): Promise<OnboardingState | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'onboarding'));
  return snap.exists() ? (snap.data() as OnboardingState) : null;
}

export async function markOnboardingComplete(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'onboarding'), {
    completed: true,
    completedAt: Date.now(),
  });
}
