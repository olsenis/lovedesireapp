import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Question } from '../constants/content';

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
