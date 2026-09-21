import { Platform } from 'react-native';
import { Notifications } from './notificationsGuard';
import { seededShuffle } from './seed';
import { LoveLanguage, LOVE_LANGUAGE_LABELS } from '../constants/content';
import { LOVE_LANGUAGE_ACTIONS } from '../constants/loveLanguageActions';

// Weekly Monday-morning nudge: 3 concrete actions matching the partner's
// love language. Local scheduled notification via expo-notifications (same
// pattern as reminderService), so no server infrastructure needed.
//
// Scheduling model:
// - One notification identifier per user (LOVE_NUDGE_ID).
// - Fires every Monday at 09:00 local time (Notifications.WEEKLY trigger).
//   Monday matches the ISO 8601 week boundary that Sunday Check-in also
//   uses, so both weekly rituals reset on the same day. Aligned Aug 27
//   after user pointed out Sunday CI reset Monday while Love Language
//   still ran on Sunday, which was confusing.
// - On app open we cancel any old schedule and set a new one with the
//   current partner name in the body — cheap, keeps content fresh.
// - Skipped entirely on web (no notifications there) and when the
//   partner has no loveLanguage set yet (no signal to nudge on).

const LOVE_NUDGE_ID = 'love-language-weekly';

// Monday 09:00 local — start of the new ISO week, natural moment to
// plan three small things to try over the next seven days.
const NUDGE_DAY_WEEKDAY = 2; // Mon=2 in expo-notifications WEEKLY (Sun=1)
const NUDGE_HOUR = 9;
const NUDGE_MINUTE = 0;

export async function scheduleLoveLanguageNudge(
  partnerName: string,
  partnerLoveLanguage: LoveLanguage,
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Notifications) return;
  try {
    // Always cancel first so a stale nudge (old partner name, old
    // language) doesn't survive after a rename or a re-quiz.
    await Notifications.cancelScheduledNotificationAsync(LOVE_NUDGE_ID).catch(() => {});

    const langLabel = LOVE_LANGUAGE_LABELS[partnerLoveLanguage]?.label ?? 'love language';
    await Notifications.scheduleNotificationAsync({
      identifier: LOVE_NUDGE_ID,
      content: {
        title: `Speak ${partnerName}'s love language 💕`,
        body: `${langLabel}: 3 small ways to try this week. Tap to see.`,
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
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(LOVE_NUDGE_ID);
  } catch {
    /* already cancelled or unsupported */
  }
}

// Three actions a week from the partner's language pool, the SAME three on
// both phones (nothing is stored: the pick is computed from the week and the
// couple id), and NO REPEATS inside a cycle (Sep 21 2026).
//
// Until then every week was an independent shuffle of the pool, so about four
// weeks in ten brought back something from the week before. Now the pool is
// dealt like a deck: one seeded shuffle per cycle, three cards a week, and a
// new shuffle when the deck runs out (20 actions = 6 weeks without a repeat).
// A new cycle opens with what the last one did NOT deal recently, so an action
// never comes back sooner than about half a cycle.
// Weeks are counted from a fixed Monday, so any past week can be recomputed
// (Our Story's archive does exactly that).
//
// AFTER LAUNCH DO NOT CHANGE THIS FUNCTION OR REORDER A POOL: both would
// rewrite every couple's past weeks in Our Story. Add new actions at the END
// of a pool only if that is acceptable too (it reshuffles future cycles and,
// because the pool length changes, past ones): prefer a new pool version.
const PER_WEEK = 3;
const EPOCH_MONDAY = Date.UTC(2024, 0, 1, 12); // Monday 1 Jan 2024, noon UTC (DST-safe)
const WEEK_MS = 7 * 24 * 3600_000;
const deckCache = new Map<string, string[][]>();

function weekIndex(when: Date): number {
  const noon = Date.UTC(when.getFullYear(), when.getMonth(), when.getDate(), 12);
  return Math.max(0, Math.round((noon - EPOCH_MONDAY) / WEEK_MS));
}

// decks[c] = the order of cycle c. Built from cycle 0 so each cycle can avoid
// the previous cycle's closing three. A few hundred tiny shuffles at most.
function decksUpTo(language: LoveLanguage, coupleId: string, cycle: number, pool: string[], weeksPerCycle: number): string[][] {
  const key = `${coupleId}|${language}|${pool.length}`;
  const decks = deckCache.get(key) ?? [];
  for (let c = decks.length; c <= cycle; c++) {
    let deck = seededShuffle(pool, `${coupleId}-${language}-cycle${c}`);
    if (c > 0) {
      // What the previous cycle dealt in its second half goes to the back of
      // this one, so nothing returns sooner than about half a cycle (with 20
      // actions: never sooner than 4 weeks; simulated over two years).
      const used = weeksPerCycle * PER_WEEK;
      const recent = new Set(decks[c - 1].slice(used - Math.floor(weeksPerCycle / 2) * PER_WEEK, used));
      deck = [...deck.filter((a) => !recent.has(a)), ...deck.filter((a) => recent.has(a))];
    }
    decks.push(deck);
  }
  deckCache.set(key, decks);
  return decks;
}

export function pickWeeklyActions(
  language: LoveLanguage,
  coupleId: string,
  when: Date = weekAnchor(),
): string[] {
  const pool = LOVE_LANGUAGE_ACTIONS[language] ?? [];
  if (pool.length === 0) return [];
  if (pool.length <= PER_WEEK) return pool.slice();
  const weeksPerCycle = Math.floor(pool.length / PER_WEEK);
  const w = weekIndex(weekAnchor(when));
  const cycle = Math.floor(w / weeksPerCycle);
  const pos = w % weeksPerCycle;
  const deck = decksUpTo(language, coupleId, cycle, pool, weeksPerCycle)[cycle];
  return deck.slice(pos * PER_WEEK, pos * PER_WEEK + PER_WEEK);
}

// ─── helpers ─────────────────────────────────────────────────────────

// Monday of the current ISO week — used as the anchor so both partners
// land on the same seed regardless of which weekday they open the
// nudge. Monday-anchored (Aug 27) to match Sunday Check-in's ISO week
// boundary so both weekly rituals roll over on the same day.
export function weekAnchor(now: Date = new Date()): Date {
  const d = new Date(now);
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  // Distance back to Monday: 0 for Mon, 1 for Tue, ..., 6 for Sun.
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekKey(d: Date): string {
  // yyyy-mm-dd of the Monday anchor — collides only for dates within
  // the same week, which is exactly what we want.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// seededShuffle / mulberry32 / hashString moved to services/seed.ts
// (Sep 2026) so Memory Lane can share them. Same algorithms, same
// output, so weekly picks are unchanged.
