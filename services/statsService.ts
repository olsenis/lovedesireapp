import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// Aggregate anonymous usage counter — never stores uid, coupleId, or content.
// Only monthly integer counts per feature. GDPR-safe by construction (no
// personal data → no consent obligation, no user rights obligations).
//
// Design principles:
// - Aggregate-only: nothing ties an event back to a specific user
// - Fire-and-forget: never blocks UX, silent catch on failure
// - Monthly buckets: time-series without infinite growth
// - Write-only from client (Firestore rules): admin dashboard uses a
//   callable to read; client can only increment
//
// Full design in ADMIN_DASHBOARD.md § Piece 1.

function currentMonthKey(): string {
  // UTC month, matches the same bucket key used for stats aggregation
  // regardless of client timezone. Two partners in different tz's still
  // land in the same monthly bucket.
  return new Date().toISOString().slice(0, 7); // "2026-08"
}

function currentDayKey(): string {
  // UTC day. Sep 3 2026 retention analytics addition — day-bucket lets
  // us compute DAU, cohort retention curves (D1/D7/D30 per signup cohort)
  // and time-since-last-active distributions without introducing any
  // per-user timeline. Same coupleId granularity as the monthly bucket.
  return new Date().toISOString().slice(0, 10); // "2026-09-03"
}

// Increment a named counter in the current month's stats doc. Default
// increment is 1 (event counter); pass `by` to add a larger value (used
// by session time aggregates in telemetryService). Fire-and-forget —
// errors are swallowed so a failed stats write never breaks the caller.
export async function trackEvent(name: string, by: number = 1): Promise<void> {
  try {
    const ref = doc(db, 'stats', currentMonthKey());
    await setDoc(ref, { [name]: increment(by) }, { merge: true });
  } catch {
    // Silent — telemetry must never affect app behaviour.
  }
}

// Convenience: track a screen mount. Just prefixes with `screen_` for
// grep-friendly consistency in the stats dashboard.
export async function trackScreen(name: string): Promise<void> {
  return trackEvent(`screen_${name}`);
}

// Mark a couple as active in the current month. Enables MAU / WAU counts
// without leaking per-couple usage patterns — admin dashboard just counts
// docs, never inspects individual coupleId activity. Idempotent by design:
// same doc written every session, merges silently, aggregate is just a
// count query. Fire-and-forget with silent catch.
export async function markCoupleActive(coupleId: string): Promise<void> {
  if (!coupleId) return;
  try {
    // Monthly bucket — unchanged. Powers MAU counts.
    const monthRef = doc(db, 'activeCouples', currentMonthKey(), 'couples', coupleId);
    // Day bucket — new Sep 3 addition. Powers DAU counts, cohort
    // retention curves (D1/D7/D30 per signup cohort), and days-since-
    // last-active distributions. Same coupleId granularity as the
    // monthly bucket — no new privacy commitment. Docs auto-cleaned
    // after 12mo by cleanupOldDailyBuckets in Cloud Functions.
    const dayRef = doc(db, 'activeCouples', currentDayKey(), 'couples', coupleId);
    await Promise.all([
      setDoc(monthRef, { active: true }, { merge: true }),
      setDoc(dayRef, { active: true, activeAt: Date.now() }, { merge: true }),
    ]);
  } catch {
    // Silent — telemetry must never affect app behaviour.
  }
}
