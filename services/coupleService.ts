import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteField,
  runTransaction,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Crypto from 'expo-crypto';
import app, { db } from './firebase';
import { trackEvent } from './statsService';

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
  // Subscription lives on the couple, not the individual — one paid tier
  // covers both partners. Written by the RevenueCat webhook (Cloud Function
  // admin SDK) via post-purchase flow, plus manually via Firebase Console
  // for QA. Client cannot write this field; firestore.rules enforces.
  isPremium?: boolean;
  // Timestamp when the current subscription becomes active or was set. Used
  // by the admin flow to distinguish a fresh subscription from a grandfathered
  // test flag. Absent = never set.
  premiumSince?: number;
  // Aug 2026 pairing accept/decline flow (H22). When someone submits a
  // valid invite code, the server function writes their uid + display
  // name into pendingPartner2Uid + pendingPartner2Name (NOT partner2Uid)
  // so the inviter must explicitly Accept before the couple is confirmed.
  // partner1Uid can move pending → partner2Uid (accept) or clear pending
  // fields (decline). pendingPartner2Uid can clear their own fields
  // (cancel). See firestore.rules for the enforcement.
  pendingPartner2Uid?: string;
  pendingPartner2Name?: string;
  pendingPartner2At?: number;
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
    trackEvent('couple_paired');
    return { couple: snap.data() as Couple };
  } catch (e: any) {
    console.error('[joinCouple] error:', e);
    if (e?.code === 'functions/resource-exhausted') {
      throw new Error('Too many attempts. Please wait a moment and try again.');
    }
    // Network failures surface as functions/internal with no server log — usually the client couldn't reach the endpoint.
    if (e?.code === 'functions/internal' || e?.message === 'internal') {
      return { couple: null, reason: 'no_connection' };
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
  const snap = await getDoc(doc(db, 'couples', coupleId));
  return snap.exists() ? (snap.data() as Couple) : null;
}

// ─── Pairing accept/decline flow (Aug 2026, H22) ─────────────────────────────
// rateLimitedJoin now writes pendingPartner2Uid + pendingPartner2Name +
// pendingPartner2At rather than partner2Uid. These three transitions turn
// a pending request into a committed / rejected / cancelled outcome.

// Existing member accepts: move pending → whichever partner slot is
// empty (partner2 in initial pairing, partner1 in re-pair after
// disconnect), clear pending fields. Role-agnostic so both flows work.
// Transaction reads live doc so a concurrent Cancel by the pending
// party is respected (returns { ok: false, reason: 'cancelled' }).
export async function acceptPairing(
  coupleId: string,
  myUid: string,
): Promise<{ ok: boolean; reason?: string }> {
  const ref = doc(db, 'couples', coupleId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, reason: 'not_found' };
    const live = snap.data() as Couple;
    if (!live.pendingPartner2Uid) return { ok: false, reason: 'cancelled' };
    // Accepter must already be a member (only existing members can
    // decide who joins the couple). partner1 accepts in the initial-
    // pairing case; partner2 accepts in the re-pair-after-disconnect
    // case.
    const isMember = live.partner1Uid === myUid || live.partner2Uid === myUid;
    if (!isMember) return { ok: false, reason: 'not_owner' };
    if (live.partner1Uid && live.partner2Uid) return { ok: false, reason: 'already_paired' };
    // Fill whichever slot is empty. Initial pairing → partner2Uid is
    // empty. Re-pair after Óli disconnect → partner1Uid is empty.
    const targetField = live.partner1Uid ? 'partner2Uid' : 'partner1Uid';
    tx.update(ref, {
      [targetField]: live.pendingPartner2Uid,
      pendingPartner2Uid: deleteField(),
      pendingPartner2Name: deleteField(),
      pendingPartner2At: deleteField(),
    });
    trackEvent('couple_accepted');
    return { ok: true };
  });
}

// Existing member declines: clear pending fields, keep the couple doc +
// invite code intact so a fresh re-request is possible if the pending
// party retries or a different partner joins later.
export async function declinePairing(
  coupleId: string,
  myUid: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const live = snap.data() as Couple;
    const isMember = live.partner1Uid === myUid || live.partner2Uid === myUid;
    if (!isMember) return;
    if (!live.pendingPartner2Uid) return;
    tx.update(ref, {
      pendingPartner2Uid: deleteField(),
      pendingPartner2Name: deleteField(),
      pendingPartner2At: deleteField(),
    });
  });
  trackEvent('couple_declined');
}

// Pending party (pendingPartner2Uid) cancels their own request. Frees the
// slot so someone else can join, or the same user can re-submit later.
export async function cancelPairingRequest(
  coupleId: string,
  myUid: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const live = snap.data() as Couple;
    if (live.pendingPartner2Uid !== myUid) return;
    tx.update(ref, {
      pendingPartner2Uid: deleteField(),
      pendingPartner2Name: deleteField(),
      pendingPartner2At: deleteField(),
    });
  });
  trackEvent('couple_pairing_cancelled');
}
