import { doc, setDoc, updateDoc, onSnapshot, query, collection, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

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
  const q = query(
    collection(db, 'couples', coupleId, 'moments'),
    orderBy('createdAt', 'desc'),
    limit(30)
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
}
