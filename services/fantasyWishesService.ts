import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, runTransaction, deleteField, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { FantasyWishesCategory } from '../constants/content';

export type FWVote = 'yes' | 'maybe' | 'no';

export interface FantasyWishesItem {
  id: string;
  text: string;
  votes: Record<string, FWVote>;
  addToList?: string[]; // uids who pressed "Add to Together List"
  createdAt: number;
  // Stamped once, atomically, when the vote that completes the mutual
  // YES lands. Absent on legacy matches from before this field was
  // introduced — the Matches list sort falls back to createdAt for
  // those so the ordering degrades gracefully instead of crashing.
  matchedAt?: number;
  // Preset category (Sep 2026, USER_VOICE A6). Absent on couple-written
  // wishes and on items loaded before categories existed: those are
  // always shown, never filtered.
  category?: FantasyWishesCategory;
  // Reactions and replies on a match (Sep 2026, USER_VOICE C2): uid -> true / text.
  reactions?: Record<string, true>;
  replies?: Record<string, string>;
}

export function subscribeFantasyWishes(coupleId: string, onChange: (items: FantasyWishesItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'fantasyWishes'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FantasyWishesItem)));
  });
}

// Returns the newly created doc id so callers can inject the wish into the
// active view immediately (e.g. Fantasy Wishes' locked-5 batch bumps to 6
// when the user adds a custom wish, so it's visible without waiting for
// Load 5 more).
export async function addFantasyWishesItem(coupleId: string, text: string, category?: FantasyWishesCategory): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text,
    votes: {},
    createdAt: Date.now(),
    ...(category ? { category } : {}),
  });
  return ref.id;
}

// Per-couple category choice lives on the couple doc (couples/{id}.fwCategories,
// absent = on) so both phones filter on the same value through the couple
// subscription they already hold. Either partner may change it.
export async function setFWCategory(coupleId: string, category: FantasyWishesCategory, on: boolean): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { [`fwCategories.${category}`]: on });
  trackEvent(on ? 'fw_category_on' : 'fw_category_off');
}

// Vote and, if this YES completes the mutual match, stamp matchedAt in the
// same write so the Matches list can sort by true completion order rather
// than the wish's creation date. Uses a transaction only for the completing
// case so the common non-YES / no-partner-known write stays a cheap update.
export async function voteOnFantasyWish(
  coupleId: string,
  itemId: string,
  uid: string,
  vote: FWVote,
  partnerId?: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'fantasyWishes', itemId);
  if (vote !== 'yes' || !partnerId) {
    await updateDoc(ref, { [`votes.${uid}`]: vote });
    trackEvent('fantasy_wish_voted');
    return;
  }
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as FantasyWishesItem;
    const partnerAlreadyYes = data.votes?.[partnerId] === 'yes';
    const myPreviousVote = data.votes?.[uid];
    const willBeNewMatch = partnerAlreadyYes && myPreviousVote !== 'yes';
    tx.update(ref, {
      [`votes.${uid}`]: 'yes',
      ...(willBeNewMatch ? { matchedAt: Date.now() } : {}),
    });
  });
  trackEvent('fantasy_wish_voted');
}

// A heart and one line on a match (USER_VOICE C2).
export async function reactToFantasyWish(coupleId: string, uid: string, itemId: string, on: boolean): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'fantasyWishes', itemId), {
    [`reactions.${uid}`]: on ? true : deleteField(),
  });
  if (on) trackEvent('reaction_sent');
}

export async function replyToFantasyWish(coupleId: string, uid: string, itemId: string, text: string): Promise<void> {
  const clean = text.trim().slice(0, 200);
  await updateDoc(doc(db, 'couples', coupleId, 'fantasyWishes', itemId), {
    [`replies.${uid}`]: clean ? clean : deleteField(),
  });
  if (clean) trackEvent('reply_sent');
}

export function isFWMatch(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return item.votes[uid1] === 'yes' && item.votes[uid2] === 'yes';
}

// Atomic version of the "I want to add this to Together List" mark.
// Reads the addToList array inside a transaction, adds the caller's uid if
// missing, and returns completedNow=true ONLY for the caller whose write made
// the pair complete. Prevents the race where both partners press within the
// same second, each reads a snapshot where only their own uid is missing, and
// neither writes the todo — same pattern already used in dailyWishService.
export async function markFWAddToListAtomic(
  coupleId: string,
  uid: string,
  partnerId: string | undefined,
  itemId: string,
): Promise<{ completedNow: boolean }> {
  const ref = doc(db, 'couples', coupleId, 'fantasyWishes', itemId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { completedNow: false };
    const data = snap.data() as FantasyWishesItem;
    const currentList = data.addToList ?? [];
    if (currentList.includes(uid)) return { completedNow: false }; // Idempotent
    const newList = [...currentList, uid];
    tx.update(ref, { addToList: newList });
    return { completedNow: !!partnerId && newList.includes(partnerId) };
  });
  if (result.completedNow) trackEvent('fantasy_wish_match');
  return result;
}

export function fwBothWantToAdd(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return (item.addToList ?? []).includes(uid1) && (item.addToList ?? []).includes(uid2);
}

export async function clearAndReloadFantasyWishes(
  coupleId: string,
  presets: { text: string; category?: FantasyWishesCategory }[]
): Promise<void> {
  // Delete all existing items
  const snap = await getDocs(collection(db, 'couples', coupleId, 'fantasyWishes'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  // Load new presets
  await Promise.all(presets.map((p) => addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text: p.text, votes: {}, createdAt: Date.now(), ...(p.category ? { category: p.category } : {}),
  })));
}
