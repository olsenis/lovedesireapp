import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type IntimacyLocation =
  | 'bedroom' | 'living_room' | 'bathroom_shower' | 'kitchen' | 'other_home'
  | 'hotel' | 'vacation_rental' | 'car' | 'outdoors_nature' | 'beach'
  | 'at_friends' | 'work' | 'public_semi' | 'other';

export type IntimacyType = 'intercourse' | 'oral' | 'manual' | 'toys' | 'foreplay_only' | 'other';
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
  beach:            { emoji: '🏖️', label: 'Beach' },
  at_friends:       { emoji: '👫', label: "Friends'" },
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
