import { collection, doc, query, getDoc, getDocs, orderBy, limit, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Question, VERSUS_STARTER_POOL } from '../constants/content';

// Persistent stats across sessions — best score / longest streak the couple
// has ever hit. Encourages return visits ("beat our record") without the
// forced-daily anxiety of a full streak-shame mechanic. Written on game end.
export interface VersusStats {
  bestScorePct: number;      // best % correct in a single game (0-100)
  bestStreak: number;         // longest consecutive-correct in any game
  gamesPlayed: number;
  lastPlayedAt: number;
}

export async function loadVersusStats(coupleId: string): Promise<VersusStats> {
  const snap = await getDoc(doc(db, 'couples', coupleId, 'versus', 'stats'));
  if (!snap.exists()) {
    return { bestScorePct: 0, bestStreak: 0, gamesPlayed: 0, lastPlayedAt: 0 };
  }
  const data = snap.data() as Partial<VersusStats>;
  return {
    bestScorePct: data.bestScorePct ?? 0,
    bestStreak: data.bestStreak ?? 0,
    gamesPlayed: data.gamesPlayed ?? 0,
    lastPlayedAt: data.lastPlayedAt ?? 0,
  };
}

// Updates stats after a completed game, taking max of prior/new for records
// and incrementing gamesPlayed. Idempotent-ish — if the same game is
// finalized twice (rare, e.g. duplicate tap on "See result"), gamesPlayed
// double-counts but records aren't corrupted (max preserves).
export async function updateVersusStats(
  coupleId: string,
  scorePct: number,
  streak: number,
): Promise<void> {
  const current = await loadVersusStats(coupleId);
  const next: VersusStats = {
    bestScorePct: Math.max(current.bestScorePct, scorePct),
    bestStreak: Math.max(current.bestStreak, streak),
    gamesPlayed: current.gamesPlayed + 1,
    lastPlayedAt: Date.now(),
  };
  await setDoc(doc(db, 'couples', coupleId, 'versus', 'stats'), next);
}

export interface VersusItem {
  question: Question;
  partnerAnswer: string; // the real answer from partner
  options: string[]; // partnerAnswer + decoys, shuffled
  date: string; // source dailyQuestions doc date, for traceability
  gi: number; // global index in the items array
}

// Minimum number of binary-format answers the partner needs to have on
// record before Versus is worth showing. Chosen low so unlock happens
// within a week of active Daily use for most couples (binary is rare in
// the pool — ~15 of 474 questions — so an aggressive threshold like 10
// would gate too many new couples out for weeks).
//
// Query cost note: getPartnerBinaryAnswerCount reads up to 45 daily docs
// per call. Callers should cache the "unlocked" state persistently and
// only re-run this check while still locked; once unlocked, the state
// is written to users/{uid}/private/features and the count is never
// recomputed for that user (see featureUnlockService).
export const VERSUS_UNLOCK_THRESHOLD = 5;

// Pulls partner's answered questions from recent dailyQuestions docs.
// Binary questions only for v1 — open-text decoys would need richer logic.
export async function loadVersusPool(
  coupleId: string,
  uid: string,
  partnerUid: string,
  maxItems: number = 10,
): Promise<VersusItem[]> {
  const q = query(
    collection(db, 'couples', coupleId, 'dailyQuestions'),
    orderBy('date', 'desc'),
    limit(45) // ~6 weeks back
  );
  const snap = await getDocs(q);

  const pool: VersusItem[] = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as { items?: Question[]; answers?: Record<string, Record<string, string>> };
    const items = data.items ?? [];
    const partnerAnswers = data.answers?.[partnerUid] ?? {};
    items.forEach((qItem, gi) => {
      if (qItem.format !== 'binary' || !qItem.options) return;
      const partnerAns = partnerAnswers[String(gi)];
      if (!partnerAns) return;
      // Guard against schema drift: if the question's options have changed
      // since the partner answered (edited in content.ts), the stored answer
      // may no longer match either option. Skip these rather than showing a
      // stale answer as the "correct" one.
      if (!qItem.options.includes(partnerAns)) return;
      const decoy = qItem.options[0] === partnerAns ? qItem.options[1] : qItem.options[0];
      // Shuffle the two options so the right answer isn't always first
      const options = Math.random() < 0.5 ? [partnerAns, decoy] : [decoy, partnerAns];
      pool.push({ question: qItem, partnerAnswer: partnerAns, options, date: docSnap.id, gi });
    });
  }

  // Shuffle and slice
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Starter-pool fallback: fresh couples have zero (or too few) real
  // binary answers on record. Without a fallback, Versus opens to an
  // empty state on day 1 and users bounce. Fill from VERSUS_STARTER_POOL
  // with a deterministic per-day shuffle so both partners see the same
  // items in the same order if they play the same day. Once real data
  // catches up (>= maxItems binary answers on record), we drop back to
  // pure real data — no mixing to avoid "the fake ones are obvious" tells.
  if (pool.length < maxItems) {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seedStr = `${coupleId}_${dayKey}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    let a = seed || 1;
    const rand = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const starter = [...VERSUS_STARTER_POOL];
    for (let i = starter.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [starter[i], starter[j]] = [starter[j], starter[i]];
    }
    const starterItems: VersusItem[] = starter.slice(0, maxItems).map((s, idx) => {
      const optOrder = rand() < 0.5 ? [s.partnerAnswer, s.partnerAnswer === s.options[0] ? s.options[1] : s.options[0]] : [s.partnerAnswer === s.options[0] ? s.options[1] : s.options[0], s.partnerAnswer];
      return {
        question: { text: s.text, category: 'playful' as const, format: 'binary' as const, options: s.options },
        partnerAnswer: s.partnerAnswer,
        options: optOrder,
        date: `starter_${dayKey}`,
        gi: idx,
      };
    });
    return starterItems;
  }

  return pool.slice(0, maxItems);
}

// Count of partner's answered binary-format questions across the recent
// dailyQuestions window. Used to gate whether Versus is worth showing
// in Discover — a new couple with zero binary answers would just hit
// Versus's empty state, which is a dead-end tap.
//
// Reuses the same 45-day window as loadVersusPool, so if this returns
// >= VERSUS_UNLOCK_THRESHOLD the pool loader will find at least that
// many items to play with. Same schema-drift guard applies (only counts
// answers whose value still matches one of the current options).
export async function getPartnerBinaryAnswerCount(
  coupleId: string,
  partnerUid: string,
): Promise<number> {
  const q = query(
    collection(db, 'couples', coupleId, 'dailyQuestions'),
    orderBy('date', 'desc'),
    limit(45),
  );
  const snap = await getDocs(q);
  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as { items?: Question[]; answers?: Record<string, Record<string, string>> };
    const items = data.items ?? [];
    const partnerAnswers = data.answers?.[partnerUid] ?? {};
    items.forEach((qItem, gi) => {
      if (qItem.format !== 'binary' || !qItem.options) return;
      const ans = partnerAnswers[String(gi)];
      if (!ans) return;
      if (!qItem.options.includes(ans)) return; // Schema drift guard
      count++;
    });
  }
  return count;
}
