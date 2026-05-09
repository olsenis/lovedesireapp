import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type IntimacyLocation = 'home_bedroom' | 'home_other' | 'travel' | 'car' | 'outdoors' | 'other';
export type IntimacyType = 'intercourse' | 'oral' | 'manual' | 'toys' | 'foreplay_only' | 'other';
export type IntimacyMood = 'amazing' | 'good' | 'okay' | 'disconnected';

export interface IntimacyEntry {
  id: string;
  createdAt: number;
  loggedBy: string;
  initiatedBy: 'me' | 'partner' | 'both';
  location: IntimacyLocation;
  types: IntimacyType[];
  positions: string[];
  duration?: number;
  mood: IntimacyMood;
  note?: string;
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
  data: Omit<IntimacyEntry, 'id' | 'createdAt' | 'loggedBy'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'intimacyLog'), {
    ...data,
    loggedBy: uid,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteIntimacyEntry(coupleId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'intimacyLog', entryId));
}

export function getIntimacyStats(
  entries: IntimacyEntry[],
  uid: string
): IntimacyStats {
  const now = Date.now();
  const MS_DAY = 86400000;

  const totalCount = entries.length;
  const lastDate = entries.length > 0 ? entries[0].createdAt : null;
  const daysSinceLast = lastDate ? Math.floor((now - lastDate) / MS_DAY) : null;

  // Avg per month over last 3 months
  const threeMonthsAgo = now - 90 * MS_DAY;
  const recent = entries.filter(e => e.createdAt >= threeMonthsAgo);
  const avgPerMonth = Math.round((recent.length / 3) * 10) / 10;

  // Most common location
  const locCount: Partial<Record<IntimacyLocation, number>> = {};
  for (const e of entries) locCount[e.location] = (locCount[e.location] ?? 0) + 1;
  const mostCommonLocation = (Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as IntimacyLocation | null;

  // Most common type
  const typeCount: Partial<Record<IntimacyType, number>> = {};
  for (const e of entries) for (const t of e.types) typeCount[t] = (typeCount[t] ?? 0) + 1;
  const mostCommonType = (Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as IntimacyType | null;

  // Initiated by
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

  // By month (last 6 months)
  const byMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const y = d.getFullYear();
    const m = d.getMonth();
    const count = entries.filter(e => {
      const ed = new Date(e.createdAt);
      return ed.getFullYear() === y && ed.getMonth() === m;
    }).length;
    byMonth.push({ month, count });
  }

  // Mood breakdown
  const moodBreakdown: Record<IntimacyMood, number> = { amazing: 0, good: 0, okay: 0, disconnected: 0 };
  for (const e of entries) moodBreakdown[e.mood] = (moodBreakdown[e.mood] ?? 0) + 1;

  return {
    totalCount, lastDate, daysSinceLast, avgPerMonth,
    mostCommonLocation, mostCommonType,
    initiatedByMe, initiatedByPartner, initiatedByBoth,
    byMonth, moodBreakdown,
  };
}
