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

// Order matters for migration safety — 'deep' appended at the end so
// existing vote indices for sweet/flirty/spicy don't shift when the
// stale-doc detector regenerates a pre-Deep-actions doc. Sweet takes
// indices 0-4, Flirty 5-9, Spicy 10-14 as before; Deep is the new
// 15-19 slot.
const CATEGORIES: DailyWishCategory[] = ['sweet', 'flirty', 'spicy', 'deep'];
const EXPECTED_ITEM_COUNT = CATEGORIES.length * 5; // 4 cats × 5 picks = 20

function pickDailyItems(date: string, coupleId: string): DailyWishItem[] {
  const result: DailyWishItem[] = [];
  for (const cat of CATEGORIES) {
    const pool = DAILY_WISH_ITEMS.filter((i) => i.category === cat);
    const shuffled = deterministicShuffle(pool, date + coupleId + cat);
    result.push(...shuffled.slice(0, 5));
  }
  return result;
}

// Doc is stale if item count doesn't match current schema. History: was
// 20 items for 4 cats (sweet/flirty/spicy/sexual), then 15 for 3 cats
// after 'sexual' merged into 'spicy' July 2026, now 20 again for 4 cats
// after Deep actions added August 2026 (deep appended at end so old
// vote indices survive). Also catches any lingering item with a
// category that isn't in the current CATEGORIES set (e.g. legacy
// 'sexual').
function isStaleDoc(items: DailyWishItem[]): boolean {
  if (items.length !== EXPECTED_ITEM_COUNT) return true;
  return items.some((i) => !CATEGORIES.includes(i.category));
}

export function subscribeDailyWishes(coupleId: string, onChange: (doc: DailyWishDoc) => void): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      const existing = snap.data() as DailyWishDoc;
      if (isStaleDoc(existing.items)) {
        // Regenerate with current schema. Preserve existing votes/addToList
        // as-is — safer than wiping them under partner races (comment said
        // preserve, but the code was overwriting {}). Sweet + Flirty pools
        // did not change so those indices still map to the same items. Only
        // Spicy indices point to different items post-merge; the worst that
        // happens is a "you voted yes" showing for an item that changed —
        // user can override with a fresh vote. Wiping meant total data loss
        // for both partners on the migration day.
        const items = pickDailyItems(date, coupleId);
        const migrated: DailyWishDoc = {
          date,
          items,
          votes: existing.votes ?? {},
          addToList: existing.addToList ?? {},
        };
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
