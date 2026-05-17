import { doc, setDoc, updateDoc, arrayUnion, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_WISH_ITEMS, DailyWishItem, DailyWishCategory } from '../constants/content';

export type DailyVote = 'yes' | 'no';

export interface DailyWishDoc {
  date: string;
  items: DailyWishItem[];
  votes: Record<string, Record<number, DailyVote>>;
  addToList?: Record<number, string[]>; // globalIndex -> [uid, ...] who pressed "Add to List"
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
  return result;
}

export function subscribeDailyWishes(coupleId: string, onChange: (doc: DailyWishDoc) => void): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      const existing = snap.data() as DailyWishDoc;
      if (existing.items.length < 20) {
        const items = pickDailyItems(date, coupleId);
        const migrated: DailyWishDoc = { date, items, votes: {}, addToList: {} };
        await setDoc(ref, migrated);
        onChange(migrated);
      } else {
        onChange(existing);
      }
    } else {
      const items = pickDailyItems(date, coupleId);
      const newDoc: DailyWishDoc = { date, items, votes: {}, addToList: {} };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

export async function voteDailyWish(coupleId: string, uid: string, globalIndex: number, vote: DailyVote): Promise<void> {
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyWishes', date), {
    [`votes.${uid}.${globalIndex}`]: vote,
  });
}

// Mark that this user wants to add this match to the Together List
export async function markAddToList(coupleId: string, uid: string, globalIndex: number): Promise<void> {
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyWishes', date), {
    [`addToList.${globalIndex}`]: arrayUnion(uid),
  });
}

// Atomic alternative for the "both pressed → add todo" race condition.
// Returns completedNow=true only for the caller whose write made the pair complete.
// Use this from the screen instead of markAddToList + reading local doc afterwards.
export async function markAddToListAtomic(
  coupleId: string,
  uid: string,
  partnerId: string,
  globalIndex: number,
): Promise<{ completedNow: boolean }> {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { completedNow: false };
    const data = snap.data() as DailyWishDoc;
    const currentList = data.addToList?.[globalIndex] ?? [];
    if (currentList.includes(uid)) return { completedNow: false }; // Idempotent — already pressed
    const newList = [...currentList, uid];
    tx.update(ref, { [`addToList.${globalIndex}`]: newList });
    return { completedNow: newList.includes(partnerId) };
  });
}

export function isMatch(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  return doc.votes[uid1]?.[index] === 'yes' && doc.votes[uid2]?.[index] === 'yes';
}

export function bothWantToAdd(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  const list = doc.addToList?.[index] ?? [];
  return list.includes(uid1) && list.includes(uid2);
}
