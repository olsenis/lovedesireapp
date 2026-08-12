import { doc, setDoc, updateDoc, arrayUnion, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_WISH_ITEMS, DailyWishItem, DailyWishCategory } from '../constants/content';
import { trackEvent } from './statsService';

export type DailyVote = 'yes' | 'no';

export interface DailyWishDoc {
  date: string;
  items: DailyWishItem[];
  votes: Record<string, Record<number, DailyVote>>;
  addToList?: Record<number, string[]>; // globalIndex -> [uid, ...] who pressed "Add to List"
  // Paid-only bonus draws stacked on top of base daily set. Each draw
  // extends items by 2 per category. Capped at 3 to keep total pool sane.
  bonusDraws?: number;
}

const BASE_PER_CAT = 5;
const BONUS_PER_CAT = 2;
export const MAX_BONUS_DRAWS = 3;

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

function expectedItemCount(bonusDraws: number): number {
  const per = BASE_PER_CAT + Math.max(0, Math.min(bonusDraws, MAX_BONUS_DRAWS)) * BONUS_PER_CAT;
  return CATEGORIES.length * per;
}

// Build the daily item list. Base pass fills the well-known indices
// (sweet 0-4, flirty 5-9, spicy 10-14, deep 15-19). Each bonus draw
// APPENDS additional items to the end grouped by category, so existing
// vote / addToList indices never shift when a partner draws more.
// Layout for draws=2:
//   [sweet_0..4, flirty_0..4, spicy_0..4, deep_0..4,     // base, 20 items
//    sweet_5..6, flirty_5..6, spicy_5..6, deep_5..6,     // draw 1, +8
//    sweet_7..8, flirty_7..8, spicy_7..8, deep_7..8]     // draw 2, +8
function pickDailyItems(date: string, coupleId: string, bonusDraws = 0): DailyWishItem[] {
  const draws = Math.max(0, Math.min(bonusDraws, MAX_BONUS_DRAWS));
  const result: DailyWishItem[] = [];
  // Base pass
  for (const cat of CATEGORIES) {
    const pool = DAILY_WISH_ITEMS.filter((i) => i.category === cat);
    const shuffled = deterministicShuffle(pool, date + coupleId + cat);
    result.push(...shuffled.slice(0, BASE_PER_CAT));
  }
  // Bonus passes appended at end, preserving base indices
  for (let d = 1; d <= draws; d++) {
    for (const cat of CATEGORIES) {
      const pool = DAILY_WISH_ITEMS.filter((i) => i.category === cat);
      const shuffled = deterministicShuffle(pool, date + coupleId + cat);
      const startAt = BASE_PER_CAT + (d - 1) * BONUS_PER_CAT;
      result.push(...shuffled.slice(startAt, startAt + BONUS_PER_CAT));
    }
  }
  return result;
}

// Doc is stale if item count doesn't match current schema. History: was
// 20 items for 4 cats (sweet/flirty/spicy/sexual), then 15 for 3 cats
// after 'sexual' merged into 'spicy' July 2026, now 20 again for 4 cats
// after Deep actions added August 2026 (deep appended at end so old
// vote indices survive). Aug 2026 also added bonusDraws — expected
// count now depends on the doc's own bonusDraws value.
function isStaleDoc(items: DailyWishItem[], bonusDraws: number): boolean {
  if (items.length !== expectedItemCount(bonusDraws)) return true;
  return items.some((i) => !CATEGORIES.includes(i.category));
}

export function subscribeDailyWishes(coupleId: string, onChange: (doc: DailyWishDoc) => void): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      const existing = snap.data() as DailyWishDoc;
      const bonus = existing.bonusDraws ?? 0;
      if (isStaleDoc(existing.items, bonus)) {
        // Regenerate with current schema. Preserve existing votes/addToList
        // as-is — safer than wiping them under partner races (comment said
        // preserve, but the code was overwriting {}). Sweet + Flirty pools
        // did not change so those indices still map to the same items. Only
        // Spicy indices point to different items post-merge; the worst that
        // happens is a "you voted yes" showing for an item that changed —
        // user can override with a fresh vote. Wiping meant total data loss
        // for both partners on the migration day.
        const items = pickDailyItems(date, coupleId, bonus);
        const migrated: DailyWishDoc = {
          date,
          items,
          votes: existing.votes ?? {},
          addToList: existing.addToList ?? {},
          bonusDraws: bonus,
        };
        await setDoc(ref, migrated);
        onChange(migrated);
      } else {
        onChange(existing);
      }
    } else {
      const items = pickDailyItems(date, coupleId);
      const newDoc: DailyWishDoc = { date, items, votes: {}, addToList: {}, bonusDraws: 0 };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

// Increments bonusDraws + regenerates items to include the extra slice.
// Preserves votes/addToList — new items append at the end (per category)
// so existing indices don't shift. Transactional so partner race can't
// double-draw. Caller must gate on paid subscription; service enforces
// nothing on the paywall front. Returns new bonusDraws count.
export async function drawMoreActions(coupleId: string): Promise<{ bonusDraws: number; capped: boolean }> {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyWishes', date);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as DailyWishDoc).bonusDraws ?? 0 : 0;
    if (current >= MAX_BONUS_DRAWS) return { bonusDraws: current, capped: true };
    const next = current + 1;
    const items = pickDailyItems(date, coupleId, next);
    if (snap.exists()) {
      const data = snap.data() as DailyWishDoc;
      tx.update(ref, { items, bonusDraws: next, votes: data.votes ?? {}, addToList: data.addToList ?? {} });
    } else {
      tx.set(ref, { date, items, votes: {}, addToList: {}, bonusDraws: next });
    }
    return { bonusDraws: next, capped: false };
  });
}

export async function voteDailyWish(coupleId: string, uid: string, globalIndex: number, vote: DailyVote): Promise<void> {
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyWishes', date), {
    [`votes.${uid}.${globalIndex}`]: vote,
  });
  trackEvent('daily_wish_voted');
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
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { completedNow: false };
    const data = snap.data() as DailyWishDoc;
    const currentList = data.addToList?.[globalIndex] ?? [];
    if (currentList.includes(uid)) return { completedNow: false }; // Idempotent — already pressed
    const newList = [...currentList, uid];
    tx.update(ref, { [`addToList.${globalIndex}`]: newList });
    return { completedNow: newList.includes(partnerId) };
  });
  if (result.completedNow) trackEvent('daily_wish_match');
  return result;
}

export function isMatch(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  return doc.votes[uid1]?.[index] === 'yes' && doc.votes[uid2]?.[index] === 'yes';
}

export function bothWantToAdd(doc: DailyWishDoc, index: number, uid1: string, uid2: string): boolean {
  const list = doc.addToList?.[index] ?? [];
  return list.includes(uid1) && list.includes(uid2);
}
