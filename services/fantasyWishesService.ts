import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type FWVote = 'yes' | 'maybe' | 'no';

export interface FantasyWishesItem {
  id: string;
  text: string;
  votes: Record<string, FWVote>;
  createdAt: number;
}

export function subscribeFantasyWishes(coupleId: string, onChange: (items: FantasyWishesItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'fantasyWishes'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FantasyWishesItem)));
  });
}

export async function addFantasyWishesItem(coupleId: string, text: string): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text,
    votes: {},
    createdAt: Date.now(),
  });
}

export async function voteOnFantasyWish(coupleId: string, itemId: string, uid: string, vote: FWVote): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'fantasyWishes', itemId), {
    [`votes.${uid}`]: vote,
  });
}

export function isFWMatch(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return item.votes[uid1] === 'yes' && item.votes[uid2] === 'yes';
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
