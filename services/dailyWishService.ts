import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_WISH_ITEMS, DailyWishItem, DailyWishCategory } from '../constants/content';

export type DailyVote = 'yes' | 'no';

export interface DailyWishDoc {
  date: string;
  items: DailyWishItem[];                              // 20 items: 5 per category
  votes: Record<string, Record<number, DailyVote>>;   // { uid: { globalIndex: vote } }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function deterministicShuffle(pool: DailyWishItem[], seedStr: string): DailyWishItem[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  }
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const j = Math.abs(seed) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDailyItems(date: string, coupleId: string): DailyWishItem[] {
  const categories: DailyWishCategory[] = ['sweet', 'flirty', 'spicy', 'sexual'];
  const result: DailyWishItem[] = [];
  for (const cat of categories) {
    const pool = DAILY_WISH_ITEMS.filter((i) => i.category === cat);
    const shuffled = deterministicShuffle(pool, date + coupleId + cat);
    result.push(...shuffled.slice(0, 5));
  }
  return result; // 20 items total: sweet[0-4], flirty[5-9], spicy[10-14], sexual[15-19]
}

export function subscribeDailyWishes(coupleId: string, onChange: (doc: DailyWishDoc) => void): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as DailyWishDoc);
    } else {
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
  globalIndex: number,
  vote: DailyVote
): Promise<void> {
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyWishes', date), {
    [`votes.${uid}.${globalIndex}`]: vote,
  });
}

export function isMatch(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  return doc.votes[uid1]?.[index] === 'yes' && doc.votes[uid2]?.[index] === 'yes';
}
