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
import * as Crypto from 'expo-crypto';
import { db } from './firebase';

export interface Couple {
  id: string;
  partner1Uid: string;
  partner2Uid?: string;
  inviteCode: string;
  inviteExpiresAt?: number; // expires 7 days after creation
  createdAt: number;
  startDate?: number; // actual relationship start date (set by couple)
}

// Exclude visually ambiguous characters (0/O, 1/I/L) for easier sharing verbally
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const INVITE_TTL_MS = 7 * 86400000; // 7 days

export function generateInviteCode(): string {
  const bytes = Crypto.getRandomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export async function createCouple(ownerUid: string): Promise<Couple> {
  const inviteCode = generateInviteCode();
  const now = Date.now();
  const coupleRef = doc(collection(db, 'couples'));
  const couple: Couple = {
    id: coupleRef.id,
    partner1Uid: ownerUid,
    inviteCode,
    inviteExpiresAt: now + INVITE_TTL_MS,
    createdAt: now,
  };
  await setDoc(coupleRef, couple);
  return couple;
}

export async function joinCouple(inviteCode: string, joinerUid: string): Promise<Couple | null> {
  const normalized = inviteCode.trim().toUpperCase();
  const q = query(collection(db, 'couples'), where('inviteCode', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const coupleDoc = snap.docs[0];
  const couple = coupleDoc.data() as Couple;

  // Check expiry
  if (couple.inviteExpiresAt && couple.inviteExpiresAt < Date.now() && !couple.partner2Uid) {
    return null;
  }
  // Block if someone else is already in the slot (but allow re-joining own couple)
  if (couple.partner2Uid && couple.partner2Uid !== joinerUid) return null;
  // Can't join a couple you created as partner1
  if (couple.partner1Uid === joinerUid) return null;

  // Clear invite code after successful join to prevent re-use
  await updateDoc(coupleDoc.ref, {
    partner2Uid: joinerUid,
    inviteCode: '',
    inviteExpiresAt: 0,
  });
  return { ...couple, partner2Uid: joinerUid };
}

// Generate a fresh invite code (for re-pairing scenarios)
export async function regenerateInviteCode(coupleId: string): Promise<string> {
  const code = generateInviteCode();
  await updateDoc(doc(db, 'couples', coupleId), {
    inviteCode: code,
    inviteExpiresAt: Date.now() + INVITE_TTL_MS,
  });
  return code;
}

export async function setCoupleStartDate(coupleId: string, startDate: number): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { startDate });
}

export async function getCouple(coupleId: string): Promise<Couple | null> {
  // TODO: fetch couple data from Firestore
  const snap = await getDoc(doc(db, 'couples', coupleId));
  return snap.exists() ? (snap.data() as Couple) : null;
}
