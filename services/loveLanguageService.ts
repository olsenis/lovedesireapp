import { doc, setDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { LoveLanguage } from '../constants/content';
import { createUserProfile } from './authService';
import { trackEvent } from './statsService';

export interface LoveLanguageResult {
  language: LoveLanguage;
  scores: Record<LoveLanguage, number>;
  completedAt: number;
}

export interface CoupleLoveLanguages {
  [uid: string]: LoveLanguageResult;
}

// Subscribe to both partners' Love Language results in the couple.
// Mirrors the subscribeCoupleBlueprints pattern so the upgraded quiz
// result screen can show partner card + compatibility live-updated.
export function subscribeCoupleLoveLanguages(
  coupleId: string,
  onChange: (results: CoupleLoveLanguages) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'couples', coupleId, 'loveLanguages'), (snap) => {
    const results: CoupleLoveLanguages = {};
    snap.docs.forEach((d) => { results[d.id] = d.data() as LoveLanguageResult; });
    onChange(results);
  });
}

// Save the quiz result. Dual-write:
//   1. Always mirror `language` primary to profile.loveLanguage so the
//      downstream Sunday nudge + Insight card (which read partner
//      profile.loveLanguage) keep working exactly as they do today.
//   2. Also save the full result (scores + timestamp + language) to
//      couples/{coupleId}/loveLanguages/{uid} when paired, or to
//      users/{uid}/private/loveLanguage as a fallback when unpaired.
//      Enables the partner card + compatibility card on the upgraded
//      result screen without breaking anything that predates the schema.
export async function saveLoveLanguageResult(
  uid: string,
  coupleId: string | undefined,
  scores: Record<LoveLanguage, number>,
): Promise<void> {
  const sorted = (Object.entries(scores) as [LoveLanguage, number][]).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const result: LoveLanguageResult = { language: primary, scores, completedAt: Date.now() };
  // Mirror primary to profile for the existing Sunday nudge + Insight
  // card + Home LL surface reads — must come first so if the couple
  // subcoll write fails, the app still functions at the profile level.
  await createUserProfile(uid, { loveLanguage: primary } as any);
  if (coupleId) {
    await setDoc(doc(db, 'couples', coupleId, 'loveLanguages', uid), result, { merge: true });
  } else {
    await setDoc(doc(db, 'users', uid, 'private', 'loveLanguage'), result, { merge: true });
  }
  trackEvent('love_language_completed');
}
