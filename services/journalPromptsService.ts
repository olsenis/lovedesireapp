import { JournalEntry } from './journalService';
import { MoodEntry, MOOD_LABELS } from './moodService';
import { JOURNAL_PROMPTS } from '../constants/journalPrompts';

// Small utility layer that turns a static prompt pool + the raw journal
// stream into the three surfaces Journal #5 needs:
//   1. pickWeeklyPrompt — deterministic seed per (week, couple) so both
//      partners see the same prompt each Sunday-to-Sunday window.
//   2. getRecentStreak — consecutive-days count of "at least one entry
//      today by me", capped at 30. Streak is client-side derived from
//      the entry stream so no Firestore writes.
//   3. getWeeklyRetro — Sunday-only recap of the past 7 days: my count,
//      partner count, dominant journal moods, partner mood-log emojis.
//
// Weekly seed pattern (weekAnchor / weekKey / seededShuffle / mulberry32)
// is duplicated inline from services/loveLanguageNudgeService.ts rather
// than extracted — two callers is not enough to justify a shared
// services/weekly.ts; extract if a third caller appears.

// ─── prompt selection ─────────────────────────────────────────────────────

export function pickWeeklyPrompt(coupleId: string, partnerName: string, when: Date = weekAnchor()): string {
  const seed = `${weekKey(when)}-${coupleId}`;
  const shuffled = seededShuffle(JOURNAL_PROMPTS, seed);
  const template = shuffled[0] ?? '';
  const name = partnerName?.trim() || 'your partner';
  return template.replace(/\{partner\}/g, name);
}

// ─── streak ───────────────────────────────────────────────────────────────

// Consecutive days ending today (inclusive) where the user has at least
// one entry. Breaks silently on a missed day — never negative, never a
// punishment. Cap at 30 so the pill doesn't grow into a brag.
export function getRecentStreak(entries: JournalEntry[], uid: string): number {
  if (entries.length === 0) return 0;
  const mine = entries.filter((e) => e.fromUid === uid);
  if (mine.length === 0) return 0;

  const daySet = new Set<string>();
  for (const e of mine) daySet.add(ymd(new Date(e.createdAt)));

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (daySet.has(ymd(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── weekly retro ─────────────────────────────────────────────────────────

export interface WeeklyRetro {
  weekLabel: string;
  myCount: number;
  partnerCount: number;
  dominantMoods: string[];
  partnerMoodDays: { emoji: string; count: number }[];
}

// Past-7-days recap. Only meaningful data appears — empty categories
// silently omit rather than pad the card with "0 entries". Returns null
// when the whole week is empty (nothing to reflect on).
export function getWeeklyRetro(
  journalEntries: JournalEntry[],
  moodEntries: MoodEntry[],
  uid: string,
  partnerId: string | null,
): WeeklyRetro | null {
  const now = new Date();
  const weekStartMs = weekStartOf(now).getTime();

  const inWeek = journalEntries.filter((e) => e.createdAt >= weekStartMs);
  const mine = inWeek.filter((e) => e.fromUid === uid);
  const partners = partnerId ? inWeek.filter((e) => e.fromUid === partnerId) : [];

  if (inWeek.length === 0) return null;

  // Dominant journal moods this week (top 2 by count, only when >= 2 of
  // the total to feel meaningful).
  const moodCount = new Map<string, number>();
  for (const e of inWeek) {
    if (!e.mood) continue;
    moodCount.set(e.mood, (moodCount.get(e.mood) ?? 0) + 1);
  }
  const dominantMoods = [...moodCount.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => humaniseJournalMood(m));

  // Partner mood emojis this week, from moodService (separate from
  // journal's own mood chips). Grouped by emoji, sorted by count.
  const partnerMoodDaysMap = new Map<string, number>();
  if (partnerId) {
    const partnerMoods = moodEntries.filter((m) => m.uid === partnerId && m.createdAt >= weekStartMs);
    for (const m of partnerMoods) {
      partnerMoodDaysMap.set(m.emoji, (partnerMoodDaysMap.get(m.emoji) ?? 0) + 1);
    }
  }
  const partnerMoodDays = [...partnerMoodDaysMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji, count]) => ({ emoji, count }));

  const weekStart = weekStartOf(now);
  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

  return {
    weekLabel,
    myCount: mine.length,
    partnerCount: partners.length,
    dominantMoods,
    partnerMoodDays,
  };
}

// ─── helpers (duplicated from loveLanguageNudgeService — see note above) ──

function weekAnchor(now: Date = new Date()): Date {
  const d = new Date(now);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Sunday-start week bounds — matches weekAnchor above but returns the
// Sunday-midnight Date object directly for retro time filtering.
function weekStartOf(now: Date): Date {
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

// Human labels for the journal's own 6-mood enum (separate from
// moodService's 12-emoji set — see stats-and-admin-pattern memory for
// why we keep them separate).
function humaniseJournalMood(key: string): string {
  const map: Record<string, string> = {
    reflective: 'reflection',
    happy: 'happiness',
    grateful: 'gratitude',
    frustrated: 'frustration',
    tender: 'tender moments',
    curious: 'curiosity',
  };
  return map[key] ?? key;
}

// Not currently used but exported for MOOD_LABELS parity if UI wants
// to render mood emoji + label. Silences unused-import warning too.
export const _MOOD_LABELS_PROXY = MOOD_LABELS;
