import { doc, setDoc, getDoc, onSnapshot, query, collection, orderBy, limit, Unsubscribe } from 'firebase/firestore';
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

export interface MomentStreak {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
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
  partnerUid: string
): Promise<void> {
  const today = todayKey();
  const ref = doc(db, 'couples', coupleId, 'moments', today);
  await setDoc(ref, {
    [`photos.${uid}`]: { photoURL, createdAt: Date.now() },
    createdAt: Date.now(),
  }, { merge: true });

  // Check if both partners have submitted and update streak
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as MomentEntry;
    if (data.photos?.[uid] && data.photos?.[partnerUid]) {
      await checkAndUpdateMomentStreak(coupleId);
    }
  }
}

export async function getMomentStreak(coupleId: string): Promise<number> {
  const snap = await getDoc(doc(db, 'couples', coupleId, 'streaks', 'moments'));
  if (!snap.exists()) return 0;
  return (snap.data() as MomentStreak).count;
}

export async function checkAndUpdateMomentStreak(coupleId: string): Promise<void> {
  const streakRef = doc(db, 'couples', coupleId, 'streaks', 'moments');
  const today = todayKey();
  const snap = await getDoc(streakRef);
  if (!snap.exists()) {
    await setDoc(streakRef, { count: 1, lastDate: today });
    return;
  }
  const streak = snap.data() as MomentStreak;
  if (streak.lastDate === today) return;
  const newCount = streak.lastDate === yesterdayKey() ? streak.count + 1 : 1;
  await setDoc(streakRef, { count: newCount, lastDate: today });
}

export function subscribeMomentStreak(
  coupleId: string,
  onChange: (streak: MomentStreak) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'couples', coupleId, 'streaks', 'moments'),
    (snap) => onChange(snap.exists() ? (snap.data() as MomentStreak) : { count: 0, lastDate: '' })
  );
}
