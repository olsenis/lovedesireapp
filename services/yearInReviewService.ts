import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { MoodEntry, MoodEmoji } from './moodService';
import { MOOD_LABELS } from './moodService';

export interface YearSummary {
  year: number;
  daysTogether: number | null;          // since couple.startDate, if set
  totalMoods: number;
  topMoodMine: { emoji: MoodEmoji; count: number; label: string } | null;
  topMoodTheirs: { emoji: MoodEmoji; count: number; label: string } | null;
  questionsAnswered: number;            // sum across all daily question docs
  momentsCaptured: number;              // days both partners submitted
  notesExchanged: number;               // total LoveNotes opened
  intimacyEntries: number;              // count (if log enabled)
  // pulseLatestScore removed Aug 2026 — the legacy `hita/latest` doc it
  // read is dead data (no writer in current codebase) and standalone
  // Pulse was merged into Sunday Check-in. Add a `sundayCheckinAvg`
  // read from stateUnion entries pulseScores if year-in-review needs
  // a pulse signal post-launch.
  daysApartCount: number;               // days when isLongDistance was on
  // Aug 2026 expansion for "Your Year Together" — surfaces the paid
  // tier's real deliverables so annual renewal reads as identity, not
  // "what did I even use." All zero-safe: cards render conditionally
  // in the screen so missing data (paid feature never used, feature
  // off, LDR-only, etc.) collapses without an empty-looking slide.
  presenceCycles: number;               // sensate/progress.cyclesCompleted
  fantasyMatches: number;               // FW items where both voted yes this year
  sundayCheckins: number;               // stateUnion docs both completed in year
  sparksSent: number;                   // sparks from this uid in year
  teaseCount: number;                   // Tease/flashes in year (paid)
}

function yearRange(year: number): { start: number; end: number } {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime(),
  };
}

function topMood(entries: MoodEntry[]): { emoji: MoodEmoji; count: number; label: string } | null {
  if (entries.length === 0) return null;
  const counts = new Map<MoodEmoji, number>();
  for (const e of entries) counts.set(e.emoji, (counts.get(e.emoji) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [emoji, count] = sorted[0];
  return { emoji, count, label: MOOD_LABELS[emoji] };
}

// Session-scoped memoisation. Aggregating a year is 8+ Firestore
// reads; users often open Year in Review, close it, tap the Home
// nudge again a minute later. Keying on coupleId+uid+year means the
// screen re-open pulls from memory. Cleared when the app cold-boots
// (module reload) which is exactly the freshness we want.
const summaryCache = new Map<string, YearSummary>();
const cacheKey = (coupleId: string, uid: string, year: number) => `${coupleId}::${uid}::${year}`;

export async function aggregateYearSummary(
  coupleId: string,
  uid: string,
  partnerId: string | undefined,
  year: number,
  options?: { intimacyLogEnabled?: boolean; startDate?: number },
): Promise<YearSummary> {
  const key = cacheKey(coupleId, uid, year);
  const cached = summaryCache.get(key);
  if (cached) return cached;
  const { start, end } = yearRange(year);

  // Days together (since couple startDate up to year end, capped at today)
  let daysTogether: number | null = null;
  if (options?.startDate) {
    const now = Math.min(Date.now(), end);
    daysTogether = Math.max(0, Math.floor((now - options.startDate) / 86400000));
  }

  // Moods this year — uid + partner separately
  const moodsQ = query(
    collection(db, 'couples', coupleId, 'moods'),
    where('createdAt', '>=', start),
    where('createdAt', '<', end),
  );
  const moodsSnap = await getDocs(moodsQ);
  const allMoods = moodsSnap.docs.map((d) => d.data() as MoodEntry);
  const myMoods = allMoods.filter((m) => m.uid === uid);
  const partnerMoods = partnerId ? allMoods.filter((m) => m.uid === partnerId) : [];

  // Questions answered — count entries in answers maps across all daily question docs
  let questionsAnswered = 0;
  try {
    const dqSnap = await getDocs(collection(db, 'couples', coupleId, 'dailyQuestions'));
    for (const d of dqSnap.docs) {
      const data: any = d.data();
      const dateStr: string | undefined = data.date;
      if (!dateStr || dateStr.slice(0, 4) !== String(year)) continue;
      const answers = (data.answers?.[uid] ?? {}) as Record<string, string>;
      questionsAnswered += Object.values(answers).filter((s) => s && s.trim()).length;
    }
  } catch {}

  // Moments — count days where both photos exist
  let momentsCaptured = 0;
  try {
    const momentsSnap = await getDocs(collection(db, 'couples', coupleId, 'moments'));
    for (const d of momentsSnap.docs) {
      const data: any = d.data();
      const dateStr: string | undefined = data.date;
      if (!dateStr || dateStr.slice(0, 4) !== String(year)) continue;
      const photos = data.photos ?? {};
      if (partnerId && photos[uid] && photos[partnerId]) momentsCaptured++;
    }
  } catch {}

  // Love Notes opened this year
  let notesExchanged = 0;
  try {
    const notesQ = query(
      collection(db, 'couples', coupleId, 'notes'),
      where('createdAt', '>=', start),
      where('createdAt', '<', end),
    );
    const notesSnap = await getDocs(notesQ);
    notesExchanged = notesSnap.docs.filter((d) => (d.data() as any).opened === true).length;
  } catch {}

  // Intimacy log entries (if feature enabled)
  let intimacyEntries = 0;
  if (options?.intimacyLogEnabled) {
    try {
      const intQ = query(
        collection(db, 'couples', coupleId, 'intimacyLog'),
        where('createdAt', '>=', start),
        where('createdAt', '<', end),
      );
      const intSnap = await getDocs(intQ);
      intimacyEntries = intSnap.size;
    } catch {}
  }

  // Presence (Sensate) cycles completed — one-doc read on
  // couples/{id}/sensate/progress. Field is a running counter, not
  // year-scoped: this shows lifetime cycles, which is arguably the
  // more meaningful "look how far you got" number for a retrospective.
  // Zero-safe: card skips when 0.
  let presenceCycles = 0;
  try {
    const snap = await getDoc(doc(db, 'couples', coupleId, 'sensate', 'progress'));
    if (snap.exists()) {
      presenceCycles = (snap.data() as any).cyclesCompleted ?? 0;
    }
  } catch {}

  // Fantasy Wishes matches — items where both partners voted yes and
  // the match landed in this year. Skips items without matchedAt (very
  // old docs, or docs where one partner voted no).
  let fantasyMatches = 0;
  try {
    const fwSnap = await getDocs(collection(db, 'couples', coupleId, 'fantasyWishes'));
    for (const d of fwSnap.docs) {
      const data: any = d.data();
      const matchedAt = data.matchedAt;
      if (typeof matchedAt !== 'number') continue;
      if (matchedAt < start || matchedAt >= end) continue;
      const votes = data.votes ?? {};
      if (partnerId && votes[uid] === 'yes' && votes[partnerId] === 'yes') fantasyMatches++;
    }
  } catch {}

  // Sunday Check-ins completed together — parent stateUnion docs where
  // both partners have a completedAt timestamp. The year filter uses
  // startedAt, which is written on doc create.
  let sundayCheckins = 0;
  try {
    const suSnap = await getDocs(collection(db, 'couples', coupleId, 'stateUnion'));
    for (const d of suSnap.docs) {
      const data: any = d.data();
      const startedAt = data.startedAt;
      if (typeof startedAt !== 'number') continue;
      if (startedAt < start || startedAt >= end) continue;
      const completedAt = data.completedAt ?? {};
      if (completedAt[uid] && partnerId && completedAt[partnerId]) sundayCheckins++;
    }
  } catch {}

  // Sparks I sent this year — counts my outgoing sparks, not incoming.
  // "Sent" is the identity moment: you thought of them, you reached out.
  let sparksSent = 0;
  try {
    const sparksQ = query(
      collection(db, 'couples', coupleId, 'sparks'),
      where('createdAt', '>=', start),
      where('createdAt', '<', end),
    );
    const sparksSnap = await getDocs(sparksQ);
    sparksSent = sparksSnap.docs.filter((d) => (d.data() as any).fromUid === uid).length;
  } catch {}

  // Tease (Flashes) — paid feature, count of ephemeral media sent this
  // year. Card renders only when count > 0, so free-tier couples never
  // see this slide.
  let teaseCount = 0;
  try {
    const flashesQ = query(
      collection(db, 'couples', coupleId, 'flashes'),
      where('createdAt', '>=', start),
      where('createdAt', '<', end),
    );
    const flashesSnap = await getDocs(flashesQ);
    teaseCount = flashesSnap.size;
  } catch {}

  const summary: YearSummary = {
    year,
    daysTogether,
    totalMoods: allMoods.length,
    topMoodMine: topMood(myMoods),
    topMoodTheirs: topMood(partnerMoods),
    questionsAnswered,
    momentsCaptured,
    notesExchanged,
    intimacyEntries,
    daysApartCount: 0, // future enhancement — would require LDR history
    presenceCycles,
    fantasyMatches,
    sundayCheckins,
    sparksSent,
    teaseCount,
  };
  summaryCache.set(key, summary);
  return summary;
}
