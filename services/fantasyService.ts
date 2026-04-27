import { collection, addDoc, updateDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { FantasyCategory } from '../constants/content';

export type FantasyVote = 'yes' | 'maybe' | 'no';

export interface FantasyItem {
  id: string;
  text: string;
  category: FantasyCategory;
  votes: Record<string, FantasyVote>;
  createdAt: number;
}

export function subscribeFantasy(coupleId: string, onChange: (items: FantasyItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'fantasy'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FantasyItem)));
  });
}

export async function addFantasyItem(coupleId: string, text: string, category: FantasyCategory): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'fantasy'), {
    text,
    category,
    votes: {},
    createdAt: Date.now(),
  });
}

export async function voteOnFantasy(coupleId: string, itemId: string, uid: string, vote: FantasyVote): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'fantasy', itemId), {
    [`votes.${uid}`]: vote,
  });
}

export function isFantasyMatch(item: FantasyItem, uid1: string, uid2: string): boolean {
  return item.votes[uid1] === 'yes' && item.votes[uid2] === 'yes';
}
