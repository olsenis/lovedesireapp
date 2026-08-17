import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';

export type IntimacyLocation =
  | 'bedroom' | 'living_room' | 'bathroom_shower' | 'kitchen' | 'other_home'
  | 'hotel' | 'vacation_rental' | 'car' | 'outdoors_nature'
  | 'work' | 'public_semi' | 'other';

export type IntimacyType = 'intercourse' | 'oral' | 'hands' | 'toys' | 'foreplay_only' | 'other';
export type IntimacyMood = 'amazing' | 'good' | 'okay' | 'disconnected';

export const LOCATION_LABELS: Record<IntimacyLocation, { emoji: string; label: string }> = {
  bedroom:          { emoji: '🛏️', label: 'Bedroom' },
  living_room:      { emoji: '🛋️', label: 'Living room' },
  bathroom_shower:  { emoji: '🚿', label: 'Shower/bath' },
  kitchen:          { emoji: '🍳', label: 'Kitchen' },
  other_home:       { emoji: '🏠', label: 'Home (other)' },
  hotel:            { emoji: '🏨', label: 'Hotel' },
  vacation_rental:  { emoji: '🏡', label: 'Rental' },
  car:              { emoji: '🚗', label: 'Car' },
  outdoors_nature:  { emoji: '🌿', label: 'Nature' },
  work:             { emoji: '💼', label: 'Work' },
  public_semi:      { emoji: '🌃', label: 'Semi-public' },
  other:            { emoji: '📍', label: 'Other' },
};

export interface IntimacyEntry {
  id: string;
  createdAt: number;
  loggedBy: string;
  initiatedBy: 'me' | 'partner' | 'both';
  location: IntimacyLocation;
  types: IntimacyType[];
  // Custom label for the 'other' type — free-text field surfaced when
  // 'other' is included in types. Optional. When present, entry display
  // shows "Other: {otherLabel}" instead of just "Other".
  otherLabel?: string;
  positions: string[];
  duration?: number;
  mood: IntimacyMood;
  note?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  orgasm?: {
    me: { had: boolean; count: number };
    partner: { had: boolean; count: number };
  };
}

export interface IntimacyStats {
  totalCount: number;
  lastDate: number | null;
  daysSinceLast: number | null;
  avgPerMonth: number;
  mostCommonLocation: IntimacyLocation | null;
  mostCommonType: IntimacyType | null;
  initiatedByMe: number;
  initiatedByPartner: number;
  initiatedByBoth: number;
  byMonth: { month: string; count: number }[];
  moodBreakdown: Record<IntimacyMood, number>;
  avgRating: number | null;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  orgasmStats: {
    myRate: number;
    partnerRate: number;
    myAvgCount: number;
    partnerAvgCount: number;
  };
}

export function subscribeIntimacyLog(
  coupleId: string,
  onChange: (entries: IntimacyEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'intimacyLog'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntimacyEntry)));
  });
}

export async function addIntimacyEntry(
  coupleId: string,
  uid: string,
  data: Omit<IntimacyEntry, 'id' | 'createdAt' | 'loggedBy'>,
  // Optional override so users can backdate an entry (e.g. logging last
  // night's moment the following morning). Defaults to now for the common
  // "log it as it happened" case. Clamped to <= now upstream because
  // future-dated intimacy entries would be weird.
  createdAt?: number,
): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'intimacyLog'), {
    ...data,
    loggedBy: uid,
    createdAt: createdAt ?? Date.now(),
  });
  trackEvent('intimacy_log_added');
  return ref.id;
}

export async function deleteIntimacyEntry(coupleId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'intimacyLog', entryId));
}

export function getIntimacyStats(entries: IntimacyEntry[], uid: string): IntimacyStats {
  const now = Date.now();
  const MS_DAY = 86400000;

  const totalCount = entries.length;
  const lastDate = entries.length > 0 ? entries[0].createdAt : null;
  const daysSinceLast = lastDate ? Math.floor((now - lastDate) / MS_DAY) : null;

  const threeMonthsAgo = now - 90 * MS_DAY;
  const recent = entries.filter(e => e.createdAt >= threeMonthsAgo);
  const avgPerMonth = Math.round((recent.length / 3) * 10) / 10;

  const locCount: Partial<Record<IntimacyLocation, number>> = {};
  for (const e of entries) locCount[e.location] = (locCount[e.location] ?? 0) + 1;
  const mostCommonLocation = (Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as IntimacyLocation | null;

  const typeCount: Partial<Record<IntimacyType, number>> = {};
  for (const e of entries) for (const t of e.types) typeCount[t] = (typeCount[t] ?? 0) + 1;
  const mostCommonType = (Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as IntimacyType | null;

  let initiatedByMe = 0, initiatedByPartner = 0, initiatedByBoth = 0;
  for (const e of entries) {
    if (e.loggedBy === uid) {
      if (e.initiatedBy === 'me') initiatedByMe++;
      else if (e.initiatedBy === 'partner') initiatedByPartner++;
      else initiatedByBoth++;
    } else {
      if (e.initiatedBy === 'me') initiatedByPartner++;
      else if (e.initiatedBy === 'partner') initiatedByMe++;
      else initiatedByBoth++;
    }
  }

  const byMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const y = d.getFullYear(); const m = d.getMonth();
    const count = entries.filter(e => { const ed = new Date(e.createdAt); return ed.getFullYear() === y && ed.getMonth() === m; }).length;
    byMonth.push({ month, count });
  }

  const moodBreakdown: Record<IntimacyMood, number> = { amazing: 0, good: 0, okay: 0, disconnected: 0 };
  for (const e of entries) moodBreakdown[e.mood] = (moodBreakdown[e.mood] ?? 0) + 1;

  // Rating
  const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const ratedEntries = entries.filter(e => e.rating !== undefined);
  for (const e of ratedEntries) ratingBreakdown[e.rating!]++;
  const avgRating = ratedEntries.length >= 3
    ? Math.round((ratedEntries.reduce((s, e) => s + e.rating!, 0) / ratedEntries.length) * 10) / 10
    : null;

  // Orgasm stats (from perspective of who logged: 'me' = the logger)
  const orgasmEntries = entries.filter(e => e.orgasm !== undefined);
  const myOrgasmEntries = orgasmEntries.filter(e => e.loggedBy === uid);
  const myHad = myOrgasmEntries.filter(e => e.orgasm!.me.had);
  const partnerHad = myOrgasmEntries.filter(e => e.orgasm!.partner.had);
  const myRate = myOrgasmEntries.length > 0 ? Math.round((myHad.length / myOrgasmEntries.length) * 100) : 0;
  const partnerRate = myOrgasmEntries.length > 0 ? Math.round((partnerHad.length / myOrgasmEntries.length) * 100) : 0;
  const myAvgCount = myHad.length > 0 ? Math.round((myHad.reduce((s, e) => s + e.orgasm!.me.count, 0) / myHad.length) * 10) / 10 : 0;
  const partnerAvgCount = partnerHad.length > 0 ? Math.round((partnerHad.reduce((s, e) => s + e.orgasm!.partner.count, 0) / partnerHad.length) * 10) / 10 : 0;

  return {
    totalCount, lastDate, daysSinceLast, avgPerMonth,
    mostCommonLocation, mostCommonType,
    initiatedByMe, initiatedByPartner, initiatedByBoth,
    byMonth, moodBreakdown, avgRating, ratingBreakdown,
    orgasmStats: { myRate, partnerRate, myAvgCount, partnerAvgCount },
  };
}

// ─── Monthly narrative (#7 Phase 1) ────────────────────────────────────────
// Turns the raw log into a short warm story that reads at a glance. Rated
// 5.6 → 7.2 goal per ENTERTAINMENT_REVIEW.md. Pure client-side compute
// from the local entries stream; no server aggregation.

export interface NarrativeMonth {
  monthLabel: string;                 // "August 2026"
  entryCount: number;
  paragraphs: string[];                // 2-4 short sentences
  reflectionPrompt?: string;           // optional gentle nudge
}

export interface MonthlyDelta {
  countDelta: number;                  // positive = more than prev month
  direction: 'up' | 'down' | 'flat';   // flat when |delta| <= 1
  text: string;                         // "3 more than last month"
}

const NARRATIVE_MIN_ENTRIES = 3;
const DOMINANT_DAY_MIN_SHARE = 0.4;
const DOMINANT_DAY_MIN_COUNT = 4;
const DOMINANT_MOOD_SHARE = 0.6;
const RATING_DIFF_NOTABLE = 0.5;
const FAV_SPOT_MIN_SHARE = 0.4;
const FAV_SPOT_MIN_COUNT = 4;

const MOOD_LABELS: Record<IntimacyMood, string> = {
  amazing: 'Amazing',
  good: 'Good',
  okay: 'Okay',
  disconnected: 'Disconnected',
};

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

// Bound a Date to the month containing it, returning [startMs, nextMonthStartMs).
function monthBounds(d: Date): [number, number] {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return [start, next];
}

function entriesInMonth(entries: IntimacyEntry[], monthDate: Date): IntimacyEntry[] {
  const [start, end] = monthBounds(monthDate);
  return entries.filter((e) => e.createdAt >= start && e.createdAt < end);
}

// Build the narrative for a given month. Returns null when the month has
// fewer than NARRATIVE_MIN_ENTRIES entries — not enough for an honest story.
export function generateMonthlyNarrative(entries: IntimacyEntry[], monthDate: Date): NarrativeMonth | null {
  const monthEntries = entriesInMonth(entries, monthDate);
  if (monthEntries.length < NARRATIVE_MIN_ENTRIES) return null;

  const monthLabel = monthDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const paragraphs: string[] = [];

  // 1. Frequency + dominant day-of-week
  const dayCounts = new Array(7).fill(0) as number[];
  for (const e of monthEntries) dayCounts[new Date(e.createdAt).getDay()]++;
  const maxDay = dayCounts.indexOf(Math.max(...dayCounts));
  const dayShare = dayCounts[maxDay] / monthEntries.length;
  const useDayPattern = dayShare >= DOMINANT_DAY_MIN_SHARE && dayCounts[maxDay] >= DOMINANT_DAY_MIN_COUNT;
  if (useDayPattern) {
    paragraphs.push(`You connected ${monthEntries.length} times this month, most often on ${DAY_NAMES[maxDay]}.`);
  } else {
    paragraphs.push(`You connected ${monthEntries.length} times this month.`);
  }

  // 2. Mood pattern
  const moodCount: Record<IntimacyMood, number> = { amazing: 0, good: 0, okay: 0, disconnected: 0 };
  for (const e of monthEntries) moodCount[e.mood]++;
  const dominantMood = (Object.entries(moodCount) as [IntimacyMood, number][])
    .sort((a, b) => b[1] - a[1])[0];
  const disconnectedCount = moodCount.disconnected;
  let moodSentence: string | null = null;
  let reflectionPrompt: string | undefined;
  if (dominantMood[1] / monthEntries.length >= DOMINANT_MOOD_SHARE) {
    if (disconnectedCount >= 1 && dominantMood[0] !== 'disconnected') {
      moodSentence = `Mostly ${MOOD_LABELS[dominantMood[0]]}, with one Disconnected worth reflecting on.`;
      reflectionPrompt = 'Want to talk about the disconnect?';
    } else if (dominantMood[0] === 'disconnected') {
      moodSentence = `A tough month — mostly Disconnected.`;
      reflectionPrompt = 'This month was hard. Want to talk it through?';
    } else {
      moodSentence = `Mostly ${MOOD_LABELS[dominantMood[0]]}.`;
    }
  } else if (disconnectedCount >= 1) {
    moodSentence = `Mixed moods across the month, with ${disconnectedCount} Disconnected.`;
    reflectionPrompt = 'Want to reflect on the harder moments?';
  }
  if (moodSentence) paragraphs.push(moodSentence);

  // 3. Rating trend vs previous month
  const rated = monthEntries.filter((e) => e.rating !== undefined);
  if (rated.length >= 3) {
    const monthAvg = rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length;
    const prev = new Date(monthDate);
    prev.setMonth(prev.getMonth() - 1);
    const prevEntries = entriesInMonth(entries, prev).filter((e) => e.rating !== undefined);
    if (prevEntries.length >= 3) {
      const prevAvg = prevEntries.reduce((s, e) => s + (e.rating ?? 0), 0) / prevEntries.length;
      const diff = monthAvg - prevAvg;
      if (Math.abs(diff) >= RATING_DIFF_NOTABLE) {
        const dir = diff > 0 ? 'higher' : 'lower';
        paragraphs.push(`Rated slightly ${dir} than last month, ${monthAvg.toFixed(1)}.`);
      }
    }
  }

  // 4. Favourite spot (only when meaningfully dominant)
  const locCount: Partial<Record<IntimacyLocation, number>> = {};
  for (const e of monthEntries) locCount[e.location] = (locCount[e.location] ?? 0) + 1;
  const topLoc = (Object.entries(locCount) as [IntimacyLocation, number][])
    .sort((a, b) => b[1] - a[1])[0];
  if (topLoc && topLoc[1] >= FAV_SPOT_MIN_COUNT && topLoc[1] / monthEntries.length >= FAV_SPOT_MIN_SHARE) {
    const label = LOCATION_LABELS[topLoc[0]];
    if (label) paragraphs.push(`Most often ${label.emoji} ${label.label.toLowerCase()}.`);
  }

  // Cap at 4 paragraphs — a story, not a report.
  return {
    monthLabel,
    entryCount: monthEntries.length,
    paragraphs: paragraphs.slice(0, 4),
    reflectionPrompt,
  };
}

// Pulse-style month-over-month count delta. Null when the previous month
// has zero entries — nothing meaningful to compare against.
export function computeMonthlyDelta(entries: IntimacyEntry[], monthDate: Date): MonthlyDelta | null {
  const thisMonth = entriesInMonth(entries, monthDate);
  const prev = new Date(monthDate);
  prev.setMonth(prev.getMonth() - 1);
  const prevMonth = entriesInMonth(entries, prev);
  if (prevMonth.length === 0) return null;
  const countDelta = thisMonth.length - prevMonth.length;
  const abs = Math.abs(countDelta);
  if (abs <= 1) {
    return { countDelta, direction: 'flat', text: 'About the same as last month' };
  }
  if (countDelta > 0) {
    return { countDelta, direction: 'up', text: `${abs} more than last month` };
  }
  return { countDelta, direction: 'down', text: `${abs} fewer than last month` };
}

// Convenience: the "previous month" Date object (1st, midday) relative to
// the current time. Used by both the Stats view and the Home nudge branch
// so they agree on what "previous month" means.
export function previousMonthDate(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12);
  return d;
}

// Days into the current month (1-31). Home nudge fires when this is 1-7.
export function dayOfMonth(now: Date = new Date()): number {
  return now.getDate();
}
