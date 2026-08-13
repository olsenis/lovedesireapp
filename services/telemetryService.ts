import { doc, collection, addDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

// Per-couple session telemetry. Two-layer design:
//
//   Layer 1 (existing): stats/{yyyy-mm} aggregate counters. Coupleless.
//     Grows organically as sessions land. Lives forever.
//     New keys added by this service:
//       - time_{screen}_total_sec  (sum of session durations)
//       - time_{screen}_count      (number of contributing sessions)
//       - heat_{hourOfDay}_{dayOfWeek}  (overall app heatmap, 168 cells)
//
//   Layer 2 (new): sessions/{yyyy-mm}/entries/{autoId} — per-couple session
//     record {coupleId, screen, startedAt, durationSec}. Auto-deleted by
//     cleanupOldSessions Cloud Function after 12 months. Powers per-screen
//     min/max, per-couple leaderboard, and per-screen heatmap queries.
//
//   Layer 2b (new): activeCouples/{yyyy-mm}/couples/{coupleId}.sessionCount
//     — incremented on every session write. Enables cheap per-couple
//     leaderboard queries via .orderBy('sessionCount', 'desc').limit(N).
//
// See ADMIN_DASHBOARD.md for the full data model. Fire-and-forget with
// silent catch — telemetry must never affect app behaviour.

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

// Cap per-session duration (seconds). Anything longer is almost certainly
// "user locked the phone with the app open" and would poison the average.
const MAX_SESSION_SEC = 300;
// Skip sessions shorter than this — usually unmount noise from React Strict
// Mode double-invocations, fast navigation, or route pre-loading.
const MIN_SESSION_SEC = 3;

export async function writeSession(
  coupleId: string,
  screen: string,
  startedAt: number,
  durationSec: number,
): Promise<void> {
  if (!coupleId || !screen) return;
  if (durationSec < MIN_SESSION_SEC) return;
  const secs = Math.min(MAX_SESSION_SEC, Math.round(durationSec));

  try {
    const month = currentMonthKey();

    // Layer 2 — per-couple session record. Fire-and-forget.
    addDoc(collection(db, 'sessions', month, 'entries'), {
      coupleId,
      screen,
      startedAt,
      durationSec: secs,
    }).catch(() => {});

    // Layer 1 — aggregate time counters + heatmap. Fire-and-forget.
    const d = new Date(startedAt);
    const hour = d.getHours(); // client-local hour, 0-23
    const dow = d.getDay();    // client-local day-of-week, 0-6 (Sun-Sat)
    const statsRef = doc(db, 'stats', month);
    setDoc(
      statsRef,
      {
        [`time_${screen}_total_sec`]: increment(secs),
        [`time_${screen}_count`]: increment(1),
        [`heat_${hour}_${dow}`]: increment(1),
      },
      { merge: true },
    ).catch(() => {});

    // Layer 2b — per-couple sessionCount for leaderboard queries.
    // Same doc that markCoupleActive writes to; adding a counter is fine.
    setDoc(
      doc(db, 'activeCouples', month, 'couples', coupleId),
      { sessionCount: increment(1) },
      { merge: true },
    ).catch(() => {});
  } catch {
    // Silent — telemetry must never affect app behaviour.
  }
}
