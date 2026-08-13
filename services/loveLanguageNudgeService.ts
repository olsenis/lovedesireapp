import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LoveLanguage, LOVE_LANGUAGE_LABELS } from '../constants/content';
import { LOVE_LANGUAGE_ACTIONS } from '../constants/loveLanguageActions';

// Weekly Sunday-morning nudge: 3 concrete actions matching the partner's
// love language. Local scheduled notification via expo-notifications (same
// pattern as reminderService), so no server infrastructure needed.
//
// Scheduling model:
// - One notification identifier per user (LOVE_NUDGE_ID).
// - Fires every Sunday at 09:00 local time (Notifications.WEEKLY trigger).
// - On app open we cancel any old schedule and set a new one with the
//   current partner name in the body — cheap, keeps content fresh.
// - Skipped entirely on web (no notifications there) and when the
//   partner has no loveLanguage set yet (no signal to nudge on).

const LOVE_NUDGE_ID = 'love-language-weekly';

// Sunday 09:00 local — chosen for the "coffee-in-hand" moment when
// scheduling something small for the week ahead feels natural. Weekday
// mornings are too rushed; evenings compete with everything else.
const NUDGE_DAY_WEEKDAY = 1; // Sun=1 in expo-notifications WEEKLY
const NUDGE_HOUR = 9;
const NUDGE_MINUTE = 0;

export async function scheduleLoveLanguageNudge(
  partnerName: string,
  partnerLoveLanguage: LoveLanguage,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // Always cancel first so a stale nudge (old partner name, old
    // language) doesn't survive after a rename or a re-quiz.
    await Notifications.cancelScheduledNotificationAsync(LOVE_NUDGE_ID).catch(() => {});

    const langLabel = LOVE_LANGUAGE_LABELS[partnerLoveLanguage]?.label ?? 'love language';
    await Notifications.scheduleNotificationAsync({
      identifier: LOVE_NUDGE_ID,
      content: {
        title: `Speak ${partnerName}'s love language 💕`,
        body: `${langLabel} — 3 small ways to try this week. Tap to see.`,
        sound: true,
        data: { route: '/love-language-nudge' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: NUDGE_DAY_WEEKDAY,
        hour: NUDGE_HOUR,
        minute: NUDGE_MINUTE,
      },
    });
  } catch {
    // Notifications unavailable (Expo Go without projectId, simulator,
    // permission denied). Silent — nudge is optional enhancement, not a
    // core feature the app depends on.
  }
}

export async function cancelLoveLanguageNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(LOVE_NUDGE_ID);
  } catch {
    /* already cancelled or unsupported */
  }
}

// Deterministic 3-action pick from the partner's language pool. Uses
// (yyyy-ww)+coupleId as seed so both partners see the SAME three actions
// when they open the nudge screen in the same week — natural talking
// point when they compare notes.
export function pickWeeklyActions(
  language: LoveLanguage,
  coupleId: string,
  when: Date = weekAnchor(),
): string[] {
  const pool = LOVE_LANGUAGE_ACTIONS[language] ?? [];
  if (pool.length === 0) return [];
  const seed = `${weekKey(when)}-${coupleId}`;
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

// ─── helpers ─────────────────────────────────────────────────────────

// Sunday of the current week — used as the anchor so both partners land
// on the same seed regardless of which weekday they open the nudge.
function weekAnchor(now: Date = new Date()): Date {
  const d = new Date(now);
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(d: Date): string {
  // yyyy-mm-dd of the Sunday anchor — collides only for dates within
  // the same week, which is exactly what we want.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Deterministic Fisher-Yates shuffle seeded by string. Same seed →
// same order. Used so both partners see the SAME 3 actions each week.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 32-bit non-cryptographic PRNG — plenty for shuffling a 10-item pool.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
