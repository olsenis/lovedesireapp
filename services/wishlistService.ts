import { collection, addDoc, updateDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type WishVote = 'yes' | 'maybe' | 'no';
export type WishCategory = 'romantic' | 'adventure' | 'intimate' | 'spicy';

export interface WishlistItem {
  id: string;
  text: string;
  category: WishCategory;
  votes: Record<string, WishVote>; // { [uid]: vote }
  createdAt: number;
}

export const WISH_CATEGORY_CONFIG: Record<WishCategory, { label: string; emoji: string; color: string }> = {
  romantic:  { label: 'Romantic',  emoji: '🌹', color: '#FCE4EC' },
  adventure: { label: 'Adventure', emoji: '🌊', color: '#E3F2FD' },
  intimate:  { label: 'Intimate',  emoji: '🕯️', color: '#FFF3E0' },
  spicy:     { label: 'Spicy',     emoji: '🔥', color: '#FFEBEE' },
};

export function subscribeWishlist(coupleId: string, onChange: (items: WishlistItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'wishlist'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WishlistItem)));
  });
}

export async function addWishlistItem(
  coupleId: string,
  text: string,
  category: WishCategory
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'wishlist'), {
    text,
    category,
    votes: {},
    createdAt: Date.now(),
  });
}

export async function voteOnWish(
  coupleId: string,
  itemId: string,
  uid: string,
  vote: WishVote
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'wishlist', itemId), {
    [`votes.${uid}`]: vote,
  });
}

export function isMatch(item: WishlistItem, uid1: string, uid2: string): boolean {
  return item.votes[uid1] === 'yes' && item.votes[uid2] === 'yes';
}
