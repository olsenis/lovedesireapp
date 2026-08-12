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

// Increment a named counter by 1 in the current month's stats doc.
// Fire-and-forget — errors are swallowed so a failed stats write never
// breaks the caller. Callers do not need to await.
export async function trackEvent(name: string): Promise<void> {
  try {
    const ref = doc(db, 'stats', currentMonthKey());
    await setDoc(ref, { [name]: increment(1) }, { merge: true });
  } catch {
    // Silent — telemetry must never affect app behaviour.
  }
}

// Convenience: track a screen mount. Just prefixes with `screen_` for
// grep-friendly consistency in the stats dashboard.
export async function trackScreen(name: string): Promise<void> {
  return trackEvent(`screen_${name}`);
}
