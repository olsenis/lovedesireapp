import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type FWVote = 'yes' | 'maybe' | 'no';

export interface FantasyWishesItem {
  id: string;
  text: string;
  votes: Record<string, FWVote>;
  addToList?: string[]; // uids who pressed "Add to Together List"
  createdAt: number;
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
export async function addFantasyWishesItem(coupleId: string, text: string): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text,
    votes: {},
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function voteOnFantasyWish(coupleId: string, itemId: string, uid: string, vote: FWVote): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'fantasyWishes', itemId), {
    [`votes.${uid}`]: vote,
  });
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
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { completedNow: false };
    const data = snap.data() as FantasyWishesItem;
    const currentList = data.addToList ?? [];
    if (currentList.includes(uid)) return { completedNow: false }; // Idempotent
    const newList = [...currentList, uid];
    tx.update(ref, { addToList: newList });
    return { completedNow: !!partnerId && newList.includes(partnerId) };
  });
}

export function fwBothWantToAdd(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return (item.addToList ?? []).includes(uid1) && (item.addToList ?? []).includes(uid2);
}

export async function clearAndReloadFantasyWishes(
  coupleId: string,
  presets: { text: string }[]
): Promise<void> {
  // Delete all existing items
  const snap = await getDocs(collection(db, 'couples', coupleId, 'fantasyWishes'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  // Load new presets
  await Promise.all(presets.map((p) => addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text: p.text, votes: {}, createdAt: Date.now(),
  })));
}
