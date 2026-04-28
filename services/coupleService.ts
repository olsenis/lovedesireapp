import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Couple {
  id: string;
  partner1Uid: string;
  partner2Uid?: string;
  inviteCode: string;
  createdAt: number;
}

export function generateInviteCode(): string {
  // 6-character alphanumeric code (uppercase)
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createCouple(ownerUid: string): Promise<Couple> {
  // TODO: generate invite code, create couple document, update user profile
  const inviteCode = generateInviteCode();
  const coupleRef = doc(collection(db, 'couples'));
  const couple: Couple = {
    id: coupleRef.id,
    partner1Uid: ownerUid,
    inviteCode,
    createdAt: Date.now(),
  };
  await setDoc(coupleRef, couple);
  return couple;
}

export async function joinCouple(inviteCode: string, joinerUid: string): Promise<Couple | null> {
  // TODO: find couple by invite code, link second partner, update both user profiles
  const q = query(collection(db, 'couples'), where('inviteCode', '==', inviteCode));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const coupleDoc = snap.docs[0];
  const couple = coupleDoc.data() as Couple;

  // Block if someone else is already in the slot (but allow re-joining own couple)
  if (couple.partner2Uid && couple.partner2Uid !== joinerUid) return null;
  // Can't join a couple you created as partner1
  if (couple.partner1Uid === joinerUid) return null;

  await updateDoc(coupleDoc.ref, { partner2Uid: joinerUid });
  return { ...couple, partner2Uid: joinerUid };
}

export async function getCouple(coupleId: string): Promise<Couple | null> {
  // TODO: fetch couple data from Firestore
  const snap = await getDoc(doc(db, 'couples', coupleId));
  return snap.exists() ? (snap.data() as Couple) : null;
}
