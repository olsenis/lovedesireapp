import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_WISH_ITEMS, DailyWishItem } from '../constants/content';

export type DailyVote = 'yes' | 'no';

export interface DailyWishDoc {
  date: string;
  items: DailyWishItem[];
  votes: Record<string, Record<number, DailyVote>>; // { uid: { index: vote } }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function pickDailyItems(date: string, coupleId: string, count = 5): DailyWishItem[] {
  // Deterministic shuffle based on date + coupleId so both partners get same items
  let seed = 0;
  for (let i = 0; i < (date + coupleId).length; i++) {
    seed = ((seed << 5) - seed + (date + coupleId).charCodeAt(i)) | 0;
  }
  const pool = [...DAILY_WISH_ITEMS];
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const j = Math.abs(seed) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function subscribeDailyWishes(coupleId: string, onChange: (doc: DailyWishDoc) => void): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as DailyWishDoc);
    } else {
      // First access today — generate and store
      const items = pickDailyItems(date, coupleId);
      const newDoc: DailyWishDoc = { date, items, votes: {} };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

export async function voteDailyWish(
  coupleId: string,
  uid: string,
  itemIndex: number,
  vote: DailyVote
): Promise<void> {
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyWishes', date), {
    [`votes.${uid}.${itemIndex}`]: vote,
  });
}

export function isMatch(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  return doc.votes[uid1]?.[index] === 'yes' && doc.votes[uid2]?.[index] === 'yes';
}
