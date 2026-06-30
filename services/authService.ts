import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from './firebase';
import { generateInviteCode } from './coupleService';

const INVITE_TTL_MS = 7 * 86400000;

export interface UserProfile {
  uid: string;
  name: string;
  photoURL?: string;
  coupleId?: string;
  inviteCode?: string;
  pushToken?: string;
  notificationsEnabled?: boolean; // user's in-app toggle, separate from OS-level permission. Defaults to true when token is first registered.
  createdAt: number;
  birthday?: string; // DD.MM format, no year
  timezone?: string; // IANA tz like "Europe/Reykjavik" — used for LDR partner clock
  loveLanguage?: 'words' | 'acts' | 'gifts' | 'time' | 'touch'; // top result from Love Language quiz
  features?: {
    intimacyLog?: boolean;
    explicitContent?: boolean; // paid users can disable explicit content
  };
}

export async function register(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Create minimal profile immediately so profile is never null after registration
  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    name: '',
    createdAt: Date.now(),
  });
  // Send email verification (fire and forget — don't block signup if email fails)
  sendEmailVerification(credential.user).catch(() => {});
  return credential.user;
}

export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function disconnectFromCouple(uid: string): Promise<void> {
  // 1) Clear the leaving user's slot on the couple doc + rotate the invite
  //    code so anyone who had the old code can no longer re-pair into the
  //    couple. The remaining partner reads the new code from couple.inviteCode
  //    (their own profile.inviteCode field becomes stale; profile screen now
  //    sources from couple to avoid that drift).
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const profile = userSnap.data() as UserProfile;
    if (profile.coupleId) {
      const coupleRef = doc(db, 'couples', profile.coupleId);
      const coupleSnap = await getDoc(coupleRef);
      if (coupleSnap.exists()) {
        const couple = coupleSnap.data() as { partner1Uid?: string; partner2Uid?: string };
        const newCode = generateInviteCode();
        const baseUpdate: Record<string, unknown> = {
          inviteCode: newCode,
          inviteExpiresAt: Date.now() + INVITE_TTL_MS,
        };
        // Slot match. If the user's uid doesn't match either partner slot,
        // the doc is out of sync with the user profile (left over from an
        // earlier failed disconnect or manual edit). Clear BOTH slots in
        // that case — the user has profile.coupleId pointing here so they
        // believe they belong, and we'd rather over-clear than leave the
        // doc stuck thinking they're paired.
        if (couple.partner2Uid === uid) {
          baseUpdate.partner2Uid = deleteField();
        } else if (couple.partner1Uid === uid) {
          baseUpdate.partner1Uid = deleteField();
        } else {
          baseUpdate.partner1Uid = deleteField();
          baseUpdate.partner2Uid = deleteField();
        }
        await updateDoc(coupleRef, baseUpdate);
      }
    }
  }
  // 2) Remove coupleId from user profile so they land back at /pairing.
  await updateDoc(doc(db, 'users', uid), {
    coupleId: deleteField(),
    inviteCode: deleteField(),
  });
}

export async function createUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid' | 'createdAt'>
): Promise<void> {
  // Strip undefined values, Firestore rejects them
  const data: Record<string, unknown> = { uid, createdAt: Date.now() };
  for (const [k, v] of Object.entries(profile)) {
    if (v !== undefined) data[k] = v;
  }
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}
