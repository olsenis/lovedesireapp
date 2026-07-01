import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Crypto from 'expo-crypto';
import app, { db } from './firebase';

const functions = getFunctions(app);

export interface Couple {
  id: string;
  partner1Uid: string;
  partner2Uid?: string;
  inviteCode: string;
  inviteExpiresAt?: number; // expires 7 days after creation
  createdAt: number;
  startDate?: number; // actual relationship start date (set by couple)
  isLongDistance?: boolean; // LDR toggle — changes home screen, roulette, notes, etc.
  nextVisitDate?: number; // timestamp of next planned reunion (only when isLongDistance)
  partnerBirthdays?: Record<string, string>; // uid -> 'DD.MM' — entered for partner by other partner in onboarding; partner's own UserProfile.birthday takes precedence
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

export interface JoinResult {
  couple: Couple | null;
  reason?: string; // 'own' | 'taken' | 'expired' | 'not_found' | undefined on success
}

export async function joinCouple(inviteCode: string, joinerUid: string): Promise<JoinResult> {
  const fn = httpsCallable<{ inviteCode: string }, { joined: boolean; coupleId?: string; reason?: string }>(
    functions,
    'rateLimitedJoin'
  );
  try {
    const result = await fn({ inviteCode });
    console.log('[joinCouple] rateLimitedJoin →', result.data);
    if (!result.data.joined || !result.data.coupleId) {
      return { couple: null, reason: result.data.reason ?? 'not_found' };
    }
    const snap = await getDoc(doc(db, 'couples', result.data.coupleId));
    if (!snap.exists()) return { couple: null, reason: 'not_found' };
    return { couple: snap.data() as Couple };
  } catch (e: any) {
    console.error('[joinCouple] error:', e);
    if (e?.code === 'functions/resource-exhausted') {
      throw new Error('Too many attempts. Please wait a moment and try again.');
    }
    return { couple: null, reason: e?.message ?? 'unknown_error' };
  }
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

export async function setLongDistance(coupleId: string, on: boolean): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { isLongDistance: on });
}

export async function setNextVisitDate(coupleId: string, date: number | null): Promise<void> {
  // deleteField() properly removes the property when cleared; writing 0 left dirty data
  // that passed truthy checks by accident and broke getNextVisit/post-visit nudges.
  await updateDoc(doc(db, 'couples', coupleId), { nextVisitDate: date ?? deleteField() });
}

export async function setPartnerBirthday(coupleId: string, partnerUid: string, birthday: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { [`partnerBirthdays.${partnerUid}`]: birthday });
}

export async function getCouple(coupleId: string): Promise<Couple | null> {
  // TODO: fetch couple data from Firestore
  const snap = await getDoc(doc(db, 'couples', coupleId));
  return snap.exists() ? (snap.data() as Couple) : null;
}
