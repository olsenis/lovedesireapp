/**
 * Desire — Cloud Functions
 *
 * - rateLimitedJoin: server-side rate limiter for couple invite joins (Tier 1.2)
 * - deleteUserCascade: full GDPR delete when user account is removed (Tier 1.6)
 * - cleanupExpiredFlashes: scheduled deletion of flashes past 24h (Tier 1.7)
 * - cleanupOldTruthDareAudio: scheduled deletion of old audio (Tier 1.8)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { auth } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// ─── Tier 1.2: Rate-limited join ───────────────────────────────────────────
// Client should call this instead of writing to /couples directly.
// Rate limit: max 5 attempts per minute per uid, max 20 per hour.
const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 20;

export const rateLimitedJoin = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }
  const uid = req.auth.uid;
  const code = String(req.data?.inviteCode ?? '').trim().toUpperCase();
  if (!code || code.length < 6 || code.length > 12) {
    throw new HttpsError('invalid-argument', 'Invalid invite code.');
  }

  const now = Date.now();
  const rateRef = db.collection('rateLimits').doc(uid);

  // Check rate limit
  const limitOk = await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef);
    const data = snap.exists ? (snap.data() as { attempts: number[] }) : { attempts: [] };
    const recent = (data.attempts ?? []).filter((t) => now - t < 3600_000); // last hour
    const lastMinute = recent.filter((t) => now - t < 60_000);
    if (lastMinute.length >= RATE_PER_MINUTE) return false;
    if (recent.length >= RATE_PER_HOUR) return false;
    tx.set(rateRef, { attempts: [...recent, now] }, { merge: true });
    return true;
  });

  if (!limitOk) {
    throw new HttpsError('resource-exhausted', 'Too many attempts. Try again later.');
  }

  // Find couple by invite code
  const q = await db.collection('couples').where('inviteCode', '==', code).limit(1).get();
  if (q.empty) return { joined: false };
  const coupleDoc = q.docs[0];
  const couple = coupleDoc.data();

  // Validate
  if (couple.inviteExpiresAt && couple.inviteExpiresAt < now && !couple.partner2Uid) {
    return { joined: false, reason: 'expired' };
  }
  if (couple.partner2Uid && couple.partner2Uid !== uid) {
    return { joined: false, reason: 'taken' };
  }
  if (couple.partner1Uid === uid) {
    return { joined: false, reason: 'own' };
  }

  // Join + clear invite code
  await coupleDoc.ref.update({
    partner2Uid: uid,
    inviteCode: '',
    inviteExpiresAt: 0,
  });

  return { joined: true, coupleId: coupleDoc.id };
});

// ─── Tier 1.6: GDPR delete-user cascade ─────────────────────────────────────
// Triggered automatically when Firebase Auth user is deleted.
// Deletes all user data + couple data they're part of + storage files.
export const deleteUserCascade = auth.user().onDelete(async (user) => {
  const uid = user.uid;
  console.log(`Cascading delete for ${uid}`);

  // 1. Find any couples the user is part of
  const asPartner1 = await db.collection('couples').where('partner1Uid', '==', uid).get();
  const asPartner2 = await db.collection('couples').where('partner2Uid', '==', uid).get();
  const coupleDocs = [...asPartner1.docs, ...asPartner2.docs];

  // 2. Delete each couple's subcollections + storage + the couple doc itself
  for (const coupleDoc of coupleDocs) {
    const coupleId = coupleDoc.id;
    await deleteCoupleData(coupleId);
  }

  // 3. Delete user's own profile + private subcollection
  await deleteUserData(uid);

  console.log(`Cascade delete complete for ${uid}`);
});

async function deleteCoupleData(coupleId: string): Promise<void> {
  // Delete all subcollections under this couple
  const subcollections = [
    'todos', 'moods', 'memories', 'notes', 'wishlist', 'fantasy', 'fantasyWishes',
    'reminders', 'dates', 'challenge', 'blueprints', 'wyr', 'bingo', 'truthDare',
    'dailyWishes', 'dailyQuestions', 'streaks', 'sensate', 'flashes', 'moments',
    'sparks', 'pulse', 'intimacyLog', 'dateRatings',
  ];
  for (const sub of subcollections) {
    const snap = await db.collection(`couples/${coupleId}/${sub}`).get();
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let batch = db.batch();
    let count = 0;
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        batches.push(batch);
        batch = db.batch();
        count = 0;
      }
    });
    if (count > 0) batches.push(batch);
    await Promise.all(batches.map((b) => b.commit()));
  }

  // Delete storage files under couples/{coupleId}/
  try {
    await storage.deleteFiles({ prefix: `couples/${coupleId}/` });
  } catch (e) {
    console.error(`Storage delete failed for ${coupleId}:`, e);
  }

  // Delete the couple doc
  await db.doc(`couples/${coupleId}`).delete();
}

async function deleteUserData(uid: string): Promise<void> {
  // Private subcollection
  const priv = await db.collection(`users/${uid}/private`).get();
  await Promise.all(priv.docs.map((d) => d.ref.delete()));

  // User doc
  await db.doc(`users/${uid}`).delete();

  // User's profile photo
  try {
    await storage.deleteFiles({ prefix: `users/${uid}/` });
  } catch (e) {
    console.error(`Storage delete failed for user ${uid}:`, e);
  }
}

// ─── Tier 1.7: Cleanup expired flashes (24h TTL) ────────────────────────────
// Runs every hour. Privacy Policy promises "disappears after 24h" — this enforces it.
export const cleanupExpiredFlashes = onSchedule('every 60 minutes', async () => {
  const now = Date.now();

  const couples = await db.collection('couples').get();
  let totalDeleted = 0;
  for (const coupleDoc of couples.docs) {
    const flashesRef = db.collection(`couples/${coupleDoc.id}/flashes`);
    const expired = await flashesRef.where('expiresAt', '<', now).get();

    for (const flashDoc of expired.docs) {
      const data = flashDoc.data();
      // Best-effort delete the media file from Storage
      const url = data.mediaURL as string | undefined;
      if (url) {
        try {
          const path = extractStoragePath(url);
          if (path) await storage.file(path).delete().catch(() => {});
        } catch {
          // ignore
        }
      }
      await flashDoc.ref.delete();
      totalDeleted++;
    }
  }

  console.log(`Cleaned up ${totalDeleted} expired flashes`);
});

// ─── Tier 1.8: Cleanup old Truth or Dare audio (>30 days) ───────────────────
// Audio recordings from Truth or Dare are stored in Firebase Storage indefinitely.
// Privacy hygiene: delete anything older than 30 days. Runs daily.
const AUDIO_RETENTION_DAYS = 30;

export const cleanupOldTruthDareAudio = onSchedule('every 24 hours', async () => {
  const cutoff = Date.now() - AUDIO_RETENTION_DAYS * 86400_000;
  let totalDeleted = 0;

  const [files] = await storage.getFiles({ prefix: 'couples/' });
  for (const file of files) {
    if (!file.name.includes('/truthDare/')) continue;
    try {
      const [meta] = await file.getMetadata();
      const updated = meta.updated ? new Date(meta.updated as string).getTime() : 0;
      if (updated > 0 && updated < cutoff) {
        await file.delete();
        totalDeleted++;
      }
    } catch (e) {
      console.error('Audio metadata fetch failed:', file.name, e);
    }
  }

  console.log(`Cleaned up ${totalDeleted} old Truth or Dare audio files`);
});

// Extract the storage path from a Firebase download URL
function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
