// One-shot script to delete orphan / test data from Firestore before launch.
//
// What it cleans:
//   - Couple docs whose partner1Uid no longer exists in Firebase Auth
//   - Couples where BOTH partner1Uid + partner2Uid are missing/null
//   - User docs with no name (incomplete onboarding from dev testing)
//   - User docs older than 7 days that never paired with anyone
//
// Usage (from project root):
//   1. Make sure GOOGLE_APPLICATION_CREDENTIALS env var points to a service
//      account JSON with Firestore + Auth admin permissions, OR run from a
//      machine that's already authenticated via `firebase login`.
//   2. node scripts/cleanup-test-data.mjs --dry-run    # list what WOULD be deleted
//   3. node scripts/cleanup-test-data.mjs              # actually delete
//
// Always run --dry-run first and read the output carefully.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const auth = getAuth();

const DRY_RUN = process.argv.includes('--dry-run');
const STALE_USER_AGE_MS = 7 * 86400000;
const cutoff = Date.now() - STALE_USER_AGE_MS;

function log(...args) { console.log(...args); }
function dryNote() { return DRY_RUN ? ' [DRY RUN — no delete]' : ''; }

async function userExistsInAuth(uid) {
  try {
    await auth.getUser(uid);
    return true;
  } catch (e) {
    return false;
  }
}

async function cleanupCouples() {
  log('\n— Couples ———————————————————————————————————————————————————————');
  const snap = await db.collection('couples').get();
  let scrubbed = 0;
  let deleted = 0;
  let kept = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const p1 = data.partner1Uid ?? null;
    const p2 = data.partner2Uid ?? null;
    const p1Exists = p1 ? await userExistsInAuth(p1) : false;
    const p2Exists = p2 ? await userExistsInAuth(p2) : false;

    if (!p1Exists && !p2Exists) {
      log(`Delete couple ${doc.id} (both partners gone from Auth)${dryNote()}`);
      if (!DRY_RUN) await doc.ref.delete();
      deleted++;
    } else if (!p1Exists || !p2Exists) {
      const updates = {};
      if (p1 && !p1Exists) updates.partner1Uid = null;
      if (p2 && !p2Exists) updates.partner2Uid = null;
      log(`Scrub missing partner from couple ${doc.id}: ${JSON.stringify(updates)}${dryNote()}`);
      if (!DRY_RUN) await doc.ref.update(updates);
      scrubbed++;
    } else {
      kept++;
    }
  }
  log(`Couples: ${kept} kept, ${scrubbed} scrubbed, ${deleted} deleted`);
}

async function cleanupStaleUsers() {
  log('\n— Stale unpaired users ———————————————————————————————————————————');
  const snap = await db.collection('users').get();
  let deleted = 0;
  let kept = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const createdAt = typeof data.createdAt === 'number' ? data.createdAt : 0;
    const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
    const hasCouple = typeof data.coupleId === 'string' && data.coupleId.length > 0;

    // Only target: created > 7d ago, no name AND no couple = abandoned signup
    if (!hasName && !hasCouple && createdAt > 0 && createdAt < cutoff) {
      log(`Delete user ${doc.id} (no name, no couple, created ${new Date(createdAt).toISOString()})${dryNote()}`);
      if (!DRY_RUN) {
        await doc.ref.delete();
        // Also delete the Auth user if it still exists
        try { await auth.deleteUser(doc.id); } catch {}
      }
      deleted++;
    } else {
      kept++;
    }
  }
  log(`Users: ${kept} kept, ${deleted} deleted`);
}

async function main() {
  log(`Cleanup script started${DRY_RUN ? ' (DRY RUN)' : ''}`);
  await cleanupCouples();
  await cleanupStaleUsers();
  log('\nDone.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
