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
