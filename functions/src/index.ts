/**
 * Desire — Cloud Functions
 *
 * - rateLimitedJoin: server-side rate limiter for couple invite joins (Tier 1.2)
 * - deleteUserCascade: full GDPR delete when user account is removed (Tier 1.6)
 * - cleanupExpiredFlashes: scheduled deletion of flashes past 24h (Tier 1.7)
 * - cleanupOldTruthDareAudio: scheduled deletion of old audio (Tier 1.8)
 * - cleanupOldSessions: scheduled deletion of session records >12 months old (Aug 2026)
 * - adminGetOverview / adminGetStats / adminGrantPremium / adminRevokePremium /
 *   adminSearchUser: admin dashboard callables (Aug 2026)
 * - adminGetSessionStats / adminGetTimeInsights: per-screen time distribution
 *   + heatmap + per-couple leaderboard (Aug 2026)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { auth } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// ─── Admin allowlist ───────────────────────────────────────────────────────
// Hardcoded set — small enough that a full custom-claims migration is not
// worth it pre-launch. Post-launch upgrade path: swap for Firebase Auth
// custom claims (admin: true) set once via Firebase Console.
const ADMIN_UIDS = new Set<string>([
  'fL9brG7iuSe0XNomrRkDZ3N7PAl1', // Óli (olsenis@gmail.com)
]);

function assertAdmin(req: { auth?: { uid: string } | null | undefined }): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (!ADMIN_UIDS.has(req.auth.uid)) {
    throw new HttpsError('permission-denied', 'Admin only.');
  }
  return req.auth.uid;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // "2026-08"
}

// ─── Tier 1.2: Rate-limited join ───────────────────────────────────────────
// Client should call this instead of writing to /couples directly.
// Rate limit: max 5 attempts per minute per uid, max 20 per hour.
const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 20;

// invoker: 'public' allows the Cloud Run infrastructure (2nd gen callable
// functions run on Cloud Run under the hood) to accept requests without a
// Google-issued IAM token. Firebase Auth is still enforced inside the
// function via req.auth — the httpsCallable client attaches the Firebase
// ID token which we validate below. Without invoker:'public' every request
// gets rejected at the Cloud Run edge with "empty Authorization header",
// which is what surfaced as the "internal" error in the client.
export const rateLimitedJoin = onCall({ invoker: 'public' }, async (req) => {
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
  const coupleRef = q.docs[0].ref;

  // Wrap slot check + write in a transaction so two concurrent joins with
  // the same code can't both pass the "slot open" check before either
  // writes. Prior version had a read-then-write gap where an attacker
  // could race a legitimate joiner and end up in the slot while the
  // legit joiner's client thought they succeeded (M2 in Aug 2026 review).
  // Transaction retries automatically on conflict; the losing caller sees
  // `taken` instead of a silent overwrite.
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(coupleRef);
    if (!snap.exists) return { joined: false };
    const couple = snap.data()!;

    // Slot accounting — either slot may be empty (initial pairing, or one
    // partner disconnected and the remaining partner is sharing the code for
    // re-pair). Fill whichever slot is empty.
    const slot1Filled = !!couple.partner1Uid;
    const slot2Filled = !!couple.partner2Uid;

    // Both slots filled by someone else → couple is full
    if (slot1Filled && slot2Filled && couple.partner1Uid !== uid && couple.partner2Uid !== uid) {
      return { joined: false, reason: 'taken' };
    }
    // Already a member of this couple
    if (couple.partner1Uid === uid || couple.partner2Uid === uid) {
      return { joined: false, reason: 'own' };
    }
    // Expiry only matters before the first partner joins (couple is "open" for
    // initial pairing). Once any partner is in, the code stays usable for
    // re-pair scenarios after one disconnects, and there is no expiry.
    if (couple.inviteExpiresAt && couple.inviteExpiresAt < now && !slot1Filled && !slot2Filled) {
      return { joined: false, reason: 'expired' };
    }

    // Fill the empty slot — prefer partner2 to preserve original creator's
    // partner1 position when this is the initial pairing.
    // NOTE: we no longer clear inviteCode here. Clearing on first join broke
    // every re-pair scenario after a disconnect because the code lookup would
    // miss. The code now stays active throughout the couple's lifetime;
    // disconnectFromCouple regenerates it so old codes can't be reused by
    // anyone who only had the original code.
    const updates = slot2Filled ? { partner1Uid: uid } : { partner2Uid: uid };
    tx.update(coupleRef, updates);
    return { joined: true, coupleId: coupleRef.id };
  });
});

// ─── Tier 1.6: GDPR delete-user cascade ─────────────────────────────────────
// Triggered automatically when Firebase Auth user is deleted.
//
// Design: a delete must remove the user's own identity data but not destroy
// the partner's shared history. Memories, notes, challenges, etc. were created
// jointly — wiping them when only one partner leaves is GDPR overreach and a
// terrible UX for the remaining partner.
//
// Behaviour:
// 1. If the user is in a couple AND the partner is still present:
//    - Scrub the leaving user's uid from the couple doc (set their slot to null)
//    - Mark `partnerLeftAt` so the remaining partner can be informed
//    - Keep all couple subcollections + storage (shared history)
// 2. If the user is in a couple AND the partner is also already gone (or never
//    joined), it is safe to delete the entire couple + subcollections + storage.
// 3. Always delete the leaving user's own profile + private subcollections +
//    profile photo.
//
// Per-uid solo entries inside shared subcollections (mood entries tagged with
// the deleting user, intimacy log entries loggedBy them) are kept as part of the
// couple's shared history — the partner may want to look back. Privacy Policy
// must reflect this.
export const deleteUserCascade = auth.user().onDelete(async (user) => {
  const uid = user.uid;
  console.log(`Cascading delete for ${uid}`);

  // 1. Find any couples the user is part of
  const asPartner1 = await db.collection('couples').where('partner1Uid', '==', uid).get();
  const asPartner2 = await db.collection('couples').where('partner2Uid', '==', uid).get();
  const coupleDocs = [...asPartner1.docs, ...asPartner2.docs];

  for (const coupleDoc of coupleDocs) {
    const data = coupleDoc.data() as { partner1Uid?: string; partner2Uid?: string };
    const isPartner1 = data.partner1Uid === uid;
    const otherUid = isPartner1 ? data.partner2Uid : data.partner1Uid;
    const partnerStillPresent = !!otherUid && otherUid !== uid;

    if (partnerStillPresent) {
      // Scrub identity; keep shared history for the remaining partner
      await coupleDoc.ref.update({
        [isPartner1 ? 'partner1Uid' : 'partner2Uid']: null,
        partnerLeftAt: admin.firestore.FieldValue.serverTimestamp(),
        partnerLeftUid: uid,
      });
      console.log(`Scrubbed ${uid} from couple ${coupleDoc.id}, kept shared data for ${otherUid}`);
    } else {
      // No remaining partner — safe to delete everything
      await deleteCoupleData(coupleDoc.id);
      console.log(`Deleted orphan couple ${coupleDoc.id} (no partner present)`);
    }
  }

  // 2. Delete the leaving user's identity-only data
  await deleteUserData(uid);

  console.log(`Cascade delete complete for ${uid}`);
});

// Batches deletes of a plain doc collection, 400 per commit (Firestore limit is 500 including
// the transaction itself, 400 leaves headroom).
async function batchDeleteDocs(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<void> {
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  let count = 0;
  for (const d of docs) {
    batch.delete(d.ref);
    count++;
    if (count >= 400) {
      batches.push(batch);
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));
}

// Recursively delete every subcollection under a doc, then batch-delete the
// docs themselves. Uses admin SDK listCollections() so we discover children
// dynamically — no hand-maintained allowlist to keep in sync with the client
// codebase, and nested subcollections at any depth cascade automatically.
//
// This replaces the prior hardcoded 28-name allowlist + explicit nested-walk
// pattern (S2 in security review v3, Aug 2026). Also covers NV9 (previous
// deleteUserData walked users/{uid}/private only one level; the new recursion
// handles any depth that lands under private/ in the future).
//
// Ordering: recurse into each doc's subcollections BEFORE deleting the doc.
// batchDeleteDocs handles the 400-per-commit chunking.
async function deleteDocDescendants(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const subs = await docRef.listCollections();
  for (const sub of subs) {
    const snap = await sub.get();
    for (const child of snap.docs) {
      await deleteDocDescendants(child.ref);
    }
    if (snap.docs.length > 0) {
      await batchDeleteDocs(snap.docs);
    }
  }
}

async function deleteCoupleData(coupleId: string): Promise<void> {
  const coupleRef = db.doc(`couples/${coupleId}`);

  // Walk every subcollection Firestore knows about under this couple, at any
  // depth. Automatically covers current + future collections without allowlist
  // maintenance. The old allowlist missed wyrCustom (NV1) — this design closes
  // the entire class of "forgot to add the new collection to the allowlist" bug.
  await deleteDocDescendants(coupleRef);

  // Storage files under couples/{coupleId}/ — separate deletion path since
  // Storage doesn't live under Firestore.
  try {
    await storage.deleteFiles({ prefix: `couples/${coupleId}/` });
  } catch (e) {
    console.error(`Storage delete failed for ${coupleId}:`, e);
  }

  // The couple doc itself.
  await coupleRef.delete();
}

async function deleteUserData(uid: string): Promise<void> {
  const userRef = db.doc(`users/${uid}`);

  // Recurse into any subcollection under users/{uid}/, at any depth.
  // Today that's just private/, but future features adding nested paths
  // under private/ are covered without touching this code.
  await deleteDocDescendants(userRef);

  // The user doc itself.
  await userRef.delete();

  // User's profile photo + any other Storage under users/{uid}/.
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
      // Best-effort delete the media file from Storage.
      //
      // SECURITY: mediaURL is client-written and could point anywhere in the
      // bucket (any couple's photos, any user's profile.jpg). Because this
      // cleanup runs with admin SDK — which bypasses Storage rules — we MUST
      // verify the extracted path lives under this couple's flashes prefix
      // before deleting. Without the guard, a paired user could write a
      // flash to their own couple with `mediaURL` pointing at a victim's
      // moment / memory / profile photo and cause cross-couple data loss
      // once the cleanup fires (H1 in the Aug 2026 security review).
      const url = data.mediaURL as string | undefined;
      if (url) {
        try {
          const path = extractStoragePath(url);
          const allowedPrefix = `couples/${coupleDoc.id}/flashes/`;
          if (path && path.startsWith(allowedPrefix)) {
            await storage.file(path).delete().catch(() => {});
          } else if (path) {
            // Log so we can spot exploit attempts. The flash doc still gets
            // deleted below — no reason to retain a doc that couldn't be
            // cleaned up correctly — but we intentionally do NOT delete the
            // out-of-prefix Storage path.
            console.warn(`[cleanupExpiredFlashes] Skipped path outside couple prefix: flash=${flashDoc.id} couple=${coupleDoc.id} path=${path}`);
          }
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

// ─── Admin dashboard callables (Aug 2026) ───────────────────────────────────
// Every callable begins with assertAdmin(req) — the actual security gate.
// invoker: 'public' matches the pattern documented on rateLimitedJoin above;
// without it, Cloud Run rejects at the edge before Firebase Auth is checked.

// Blended monthly rate used for MRR estimates until RevenueCat pricing is wired.
const MRR_BLENDED_MONTHLY = 9.99;

// Rate limit for adminSearchUser — protects against enumeration if allowlist leaks.
const ADMIN_SEARCH_PER_MINUTE = 10;

const COUPLE_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// ─── 1. Overview: top-strip counts for the dashboard ────────────────────────
export const adminGetOverview = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const month = currentMonthKey();
  const startOfMonth = new Date(month + '-01T00:00:00Z').getTime();

  const users = db.collection('users');
  const couples = db.collection('couples');
  const activeCouples = db.collection('activeCouples').doc(month).collection('couples');

  const [totalUsersSnap, totalCouplesSnap, pairedSnap, paidSnap, activeSnap, signupsSnap] =
    await Promise.all([
      users.count().get(),
      couples.count().get(),
      couples.where('partner2Uid', '!=', null).count().get(),
      couples.where('isPremium', '==', true).count().get(),
      activeCouples.count().get(),
      users.where('createdAt', '>=', startOfMonth).count().get(),
    ]);

  const paidCouples = paidSnap.data().count;
  return {
    month,
    totalUsers: totalUsersSnap.data().count,
    totalCouples: totalCouplesSnap.data().count,
    pairedCouples: pairedSnap.data().count,
    paidCouples,
    activeCouplesThisMonth: activeSnap.data().count,
    signupsThisMonth: signupsSnap.data().count,
    mrrEstimate: Math.round(paidCouples * MRR_BLENDED_MONTHLY * 100) / 100,
  };
});

// ─── 2. Read the raw stats/{month} doc (client cannot read directly) ────────
export const adminGetStats = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const month = String(req.data?.month ?? '').trim();
  if (!MONTH_RE.test(month)) {
    throw new HttpsError('invalid-argument', 'month must be yyyy-mm.');
  }
  const snap = await db.collection('stats').doc(month).get();
  return { month, counts: (snap.exists ? snap.data() : {}) ?? {} };
});

// ─── 3. Grant premium to a couple (bypasses client-write block) ─────────────
export const adminGrantPremium = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const coupleId = String(req.data?.coupleId ?? '').trim();
  if (!COUPLE_ID_RE.test(coupleId)) {
    throw new HttpsError('invalid-argument', 'Invalid coupleId.');
  }
  const ref = db.collection('couples').doc(coupleId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Couple not found.');

  await ref.update({
    isPremium: true,
    premiumSince: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Audit trail — aggregate counter, no uid stored.
  db.collection('stats').doc(currentMonthKey()).set(
    { admin_grants: admin.firestore.FieldValue.increment(1) },
    { merge: true },
  ).catch(() => {});

  return { ok: true, coupleId };
});

// ─── 4. Revoke premium from a couple ────────────────────────────────────────
export const adminRevokePremium = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const coupleId = String(req.data?.coupleId ?? '').trim();
  if (!COUPLE_ID_RE.test(coupleId)) {
    throw new HttpsError('invalid-argument', 'Invalid coupleId.');
  }
  const ref = db.collection('couples').doc(coupleId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Couple not found.');

  await ref.update({
    isPremium: false,
    premiumSince: admin.firestore.FieldValue.delete(),
  });
  db.collection('stats').doc(currentMonthKey()).set(
    { admin_revokes: admin.firestore.FieldValue.increment(1) },
    { merge: true },
  ).catch(() => {});

  return { ok: true, coupleId };
});

// ─── 5. Look up a user by exact email + partner if paired ───────────────────
export const adminSearchUser = onCall({ invoker: 'public' }, async (req) => {
  const adminUid = assertAdmin(req);
  const email = String(req.data?.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Invalid email.');
  }

  // Rate limit per admin uid — reuse the rateLimits collection pattern.
  const now = Date.now();
  const rateRef = db.collection('rateLimits').doc(`admin_search_${adminUid}`);
  const rateOk = await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef);
    const data = snap.exists ? (snap.data() as { attempts: number[] }) : { attempts: [] };
    const recent = (data.attempts ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= ADMIN_SEARCH_PER_MINUTE) return false;
    tx.set(rateRef, { attempts: [...recent, now] }, { merge: true });
    return true;
  });
  if (!rateOk) throw new HttpsError('resource-exhausted', 'Too many searches. Try again shortly.');

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (e: any) {
    if (e?.code === 'auth/user-not-found') return { found: false };
    throw new HttpsError('internal', 'Auth lookup failed.');
  }

  const uid = userRecord.uid;
  const profileSnap = await db.collection('users').doc(uid).get();
  const profile = profileSnap.exists ? profileSnap.data() ?? {} : {};

  const coupleId = (profile as any).coupleId as string | undefined;
  let couple: any = null;
  let partner: { uid: string; name: string } | null = null;

  if (coupleId) {
    const coupleSnap = await db.collection('couples').doc(coupleId).get();
    if (coupleSnap.exists) {
      couple = coupleSnap.data();
      const partnerUid =
        couple.partner1Uid === uid ? couple.partner2Uid : couple.partner1Uid;
      if (partnerUid) {
        const partnerSnap = await db.collection('users').doc(partnerUid).get();
        const partnerData = partnerSnap.exists ? (partnerSnap.data() ?? {}) : {};
        partner = { uid: partnerUid, name: String((partnerData as any).name ?? '') };
      }
    }
  }

  return {
    found: true,
    uid,
    email: userRecord.email ?? email,
    name: String((profile as any).name ?? ''),
    coupleId: coupleId ?? null,
    isPremium: !!(couple?.isPremium),
    joinedAt: (profile as any).createdAt ?? userRecord.metadata.creationTime,
    partner,
  };
});

// ─── Session telemetry admin callables (Aug 2026) ──────────────────────────
// See services/telemetryService.ts + ADMIN_DASHBOARD.md for the data model.
// Layer 1 aggregates in stats/{month} hold total_sec / count / heatmap keys.
// Layer 2 per-couple records in sessions/{month}/entries/* power min/max
// and (via activeCouples/{month}/couples.sessionCount) leaderboard queries.

// Union of screen slugs currently instrumented by useTrackScreen. Keep in
// sync with the argument list across app/**.tsx if you add screens. Missing
// a screen just means it doesn't appear in the min/max/avg table.
const TRACKED_SCREENS = [
  'home', 'discover', 'us', 'together_list', 'profile',
  'daily', 'truth_dare', 'would_you_rather', 'activity_cards',
  'fantasy_wishes', 'versus', 'roulette', 'dares',
  'sunday_checkin', 'moments', 'notes', 'journal', 'intimacy_log',
  'pulse', 'blueprint', 'sensate',
  'reminders', 'countdown', 'calendar',
  'upgrade', 'quiz', 'challenge', 'flashes',
  'onboarding_tour', 'mood_history', 'our_story', 'year_in_review',
];

// Per-screen time distribution: uses Layer 1 for count+avg (one doc read
// covers everything) + Layer 2 for min/max (one orderBy+limit read each).
export const adminGetSessionStats = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const month = String(req.data?.month ?? '').trim();
  if (!MONTH_RE.test(month)) {
    throw new HttpsError('invalid-argument', 'month must be yyyy-mm.');
  }

  const [statsSnap, ...perScreenMinMax] = await Promise.all([
    db.collection('stats').doc(month).get(),
    ...TRACKED_SCREENS.flatMap((screen) => [
      db.collection('sessions').doc(month).collection('entries')
        .where('screen', '==', screen).orderBy('durationSec', 'asc').limit(1).get(),
      db.collection('sessions').doc(month).collection('entries')
        .where('screen', '==', screen).orderBy('durationSec', 'desc').limit(1).get(),
    ]),
  ]);

  const stats = statsSnap.exists ? (statsSnap.data() ?? {}) : {};
  const screens: Array<{
    screen: string; count: number; totalSec: number;
    avgSec: number; minSec: number | null; maxSec: number | null;
  }> = [];

  for (let i = 0; i < TRACKED_SCREENS.length; i++) {
    const screen = TRACKED_SCREENS[i];
    const count = Number(stats[`time_${screen}_count`] ?? 0);
    const totalSec = Number(stats[`time_${screen}_total_sec`] ?? 0);
    const avgSec = count > 0 ? Math.round(totalSec / count) : 0;

    const minSnap = perScreenMinMax[i * 2];
    const maxSnap = perScreenMinMax[i * 2 + 1];
    const minSec = minSnap.empty ? null : Number(minSnap.docs[0].data().durationSec);
    const maxSec = maxSnap.empty ? null : Number(maxSnap.docs[0].data().durationSec);

    screens.push({ screen, count, totalSec, avgSec, minSec, maxSec });
  }

  return { month, screens };
});

// Heatmap (24×7 grid of overall app opens) + per-couple leaderboard (top 20
// by session count). Bundled into one callable so the dashboard can render
// both sections with a single round-trip.
export const adminGetTimeInsights = onCall({ invoker: 'public' }, async (req) => {
  assertAdmin(req);
  const month = String(req.data?.month ?? '').trim();
  if (!MONTH_RE.test(month)) {
    throw new HttpsError('invalid-argument', 'month must be yyyy-mm.');
  }

  const [statsSnap, leaderboardSnap] = await Promise.all([
    db.collection('stats').doc(month).get(),
    db.collection('activeCouples').doc(month).collection('couples')
      .orderBy('sessionCount', 'desc').limit(20).get(),
  ]);

  const stats = statsSnap.exists ? (statsSnap.data() ?? {}) : {};
  // Heatmap: 24 hours × 7 days-of-week (Sun=0). Fill from `heat_H_D` keys.
  const heat: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 7; d++) {
      heat[h][d] = Number(stats[`heat_${h}_${d}`] ?? 0);
    }
  }

  // Enrich leaderboard entries with couple + partner names for the UI.
  const leaderboard = await Promise.all(
    leaderboardSnap.docs.map(async (doc) => {
      const coupleId = doc.id;
      const sessionCount = Number(doc.data().sessionCount ?? 0);
      const coupleSnap = await db.collection('couples').doc(coupleId).get();
      if (!coupleSnap.exists) {
        return { coupleId, sessionCount, names: [], isPremium: false };
      }
      const couple = coupleSnap.data() ?? {};
      const uids = [couple.partner1Uid, couple.partner2Uid].filter(Boolean) as string[];
      const partnerSnaps = await Promise.all(
        uids.map((uid) => db.collection('users').doc(uid).get()),
      );
      const names = partnerSnaps.map((s) => String((s.data() ?? {}).name ?? '(no name)'));
      return { coupleId, sessionCount, names, isPremium: !!couple.isPremium };
    }),
  );

  return { month, heat, leaderboard };
});

// ─── Scheduled cleanup: sessions older than 12 months ───────────────────────
// Runs daily. Idempotent — deletes any `sessions/{month}` documents whose
// month key is 13-36 months in the past. Uses admin SDK `recursiveDelete`
// which handles the full subcollection tree of entries in one call.
const SESSION_RETENTION_MONTHS = 12;

export const cleanupOldSessions = onSchedule('every 24 hours', async () => {
  let totalDeleted = 0;
  for (let i = SESSION_RETENTION_MONTHS + 1; i < 36; i++) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    const month = d.toISOString().slice(0, 7);
    try {
      const monthRef = db.collection('sessions').doc(month);
      const entries = await monthRef.collection('entries').limit(1).get();
      if (entries.empty) continue;
      await db.recursiveDelete(monthRef);
      totalDeleted++;
      console.log(`Cleaned up sessions/${month}`);
    } catch (e) {
      console.error(`Failed to cleanup sessions/${month}:`, e);
    }
  }
  console.log(`Session cleanup: ${totalDeleted} monthly buckets deleted`);
});
