import { doc, setDoc, updateDoc, onSnapshot, query, collection, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { markFirstRitualIfUnset } from './coupleService';

export interface MomentPhoto {
  photoURL: string;
  createdAt: number;
}

export interface MomentEntry {
  date: string; // YYYY-MM-DD (document ID)
  photos: Record<string, MomentPhoto>; // uid -> photo
  createdAt: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function subscribeMoments(
  coupleId: string,
  onChange: (moments: MomentEntry[]) => void
): Unsubscribe {
  // 120 = ~4 months of daily moments. Anything older stays in Firestore
  // but drops out of the grid. Bumped from 30 (~1 month) because that
  // felt like the "past moments are gone" for couples using the app more
  // than a month. Pagination / FlatList virtualization for deeper
  // history is tracked as a post-launch enhancement — 120 fits comfortably
  // in ScrollView + .map() without rendering pressure.
  const q = query(
    collection(db, 'couples', coupleId, 'moments'),
    orderBy('createdAt', 'desc'),
    limit(120)
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => ({ date: d.id, ...d.data() } as MomentEntry)));
  });
}

export async function submitMomentPhoto(
  coupleId: string,
  uid: string,
  photoURL: string,
): Promise<void> {
  const today = todayKey();
  const ref = doc(db, 'couples', coupleId, 'moments', today);
  const now = Date.now();
  // setDoc with merge on a nested object merges the inner map — so if the
  // partner already posted today, their photo entry stays intact. Streak
  // tracking was removed with the July 2026 cut so no transaction needed.
  await setDoc(
    ref,
    {
      createdAt: now,
      photos: { [uid]: { photoURL, createdAt: now } },
    },
    { merge: true },
  );
  trackEvent('moment_added');
  markFirstRitualIfUnset(coupleId);
}
