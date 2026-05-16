import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
  pulseLatestScore: number | null;      // from latest hita/pulse if any
  daysApartCount: number;               // days when isLongDistance was on
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

export async function aggregateYearSummary(
  coupleId: string,
  uid: string,
  partnerId: string | undefined,
  year: number,
  options?: { intimacyLogEnabled?: boolean; startDate?: number },
): Promise<YearSummary> {
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

  // Latest Pulse score (cross-year, just for context)
  let pulseLatestScore: number | null = null;
  try {
    const pulseSnap = await getDoc(doc(db, 'couples', coupleId, 'hita', 'latest'));
    if (pulseSnap.exists()) {
      const d: any = pulseSnap.data();
      if (typeof d.score === 'number') pulseLatestScore = d.score;
    }
  } catch {}

  return {
    year,
    daysTogether,
    totalMoods: allMoods.length,
    topMoodMine: topMood(myMoods),
    topMoodTheirs: topMood(partnerMoods),
    questionsAnswered,
    momentsCaptured,
    notesExchanged,
    intimacyEntries,
    pulseLatestScore,
    daysApartCount: 0, // future enhancement — would require LDR history
  };
}
